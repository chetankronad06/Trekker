"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Camera, X, Flashlight, FlashlightOff, RotateCcw, Keyboard, CheckCircle, AlertCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import jsQR from "jsqr"

interface QRScannerProps {
  onScanSuccess: (upiData: UPIData) => void
  onClose: () => void
}

interface UPIData {
  merchantId: string
  merchantName: string
  amount?: number
  transactionRef?: string
  currency: string
}

export default function QRScanner({ onScanSuccess, onClose }: QRScannerProps) {
  const [isScanning, setIsScanning] = useState(false)
  const [showManualInput, setShowManualInput] = useState(false)
  const [manualUPI, setManualUPI] = useState("")
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [scanningStatus, setScanningStatus] = useState("Ready to scan...")
  const [flashOn, setFlashOn] = useState(false)
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment")
  const [isVideoReady, setIsVideoReady] = useState(false)
  const [debugLogs, setDebugLogs] = useState<string[]>([])

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const { toast } = useToast()

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    const logMessage = `[${timestamp}] ${message}`
    console.log(logMessage)
    setDebugLogs((prev) => [logMessage, ...prev.slice(0, 9)])
  }

  const parseUPIString = (upiString: string): UPIData | null => {
    try {
      addLog(`Parsing UPI string: ${upiString.substring(0, 50)}...`)

      let url: URL
      if (upiString.startsWith("upi://pay?")) {
        url = new URL(upiString)
      } else if (upiString.includes("upi://pay?")) {
        const upiMatch = upiString.match(/upi:\/\/pay\?[^\s]*/i)
        if (upiMatch) {
          url = new URL(upiMatch[0])
        } else {
          throw new Error("No valid UPI string found")
        }
      } else {
        throw new Error("Invalid UPI format")
      }

      if (url.protocol !== "upi:" || url.pathname !== "//pay") {
        throw new Error("Invalid UPI format")
      }

      const params = url.searchParams
      const merchantId = params.get("pa")
      const merchantName = params.get("pn")
      const amount = params.get("am")
      const currency = params.get("cu") || "INR"
      const transactionRef = params.get("tr")

      if (!merchantId || !merchantName) {
        throw new Error("Missing required UPI parameters")
      }

      return {
        merchantId,
        merchantName,
        amount: amount ? Number.parseFloat(amount) : undefined,
        currency,
        transactionRef: transactionRef || undefined,
      }
    } catch (error) {
      addLog(`Error parsing UPI: ${error instanceof Error ? error.message : String(error)}`)
      return null
    }
  }

  const checkHTTPS = () => {
    const isSecure =
      window.location.protocol === "https:" ||
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1"

    addLog(`Protocol check - Secure: ${isSecure}, Protocol: ${window.location.protocol}`)

    if (!isSecure) {
      toast({
        title: "HTTPS Required",
        description: "Camera access requires HTTPS. Use https://your-domain.ngrok.io",
        variant: "destructive",
      })
      return false
    }
    return true
  }

  const startCamera = async () => {
    try {
      addLog("🎥 Starting camera initialization...")
      setScanningStatus("Checking requirements...")

      if (!checkHTTPS()) {
        setScanningStatus("HTTPS required for camera access")
        setHasPermission(false)
        return
      }

      setScanningStatus("Requesting camera access...")
      setIsVideoReady(false)
      setHasPermission(null)

      // Stop any existing stream
      if (streamRef.current) {
        addLog("🛑 Stopping existing stream...")
        streamRef.current.getTracks().forEach((track) => {
          track.stop()
          addLog(`Stopped ${track.kind} track`)
        })
        streamRef.current = null
      }

      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current)
        scanIntervalRef.current = null
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera API not supported in this browser")
      }

      const constraints = {
        video: {
          facingMode,
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
        },
      }

      addLog(`📱 Requesting media with constraints: ${JSON.stringify(constraints)}`)
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      addLog(`✅ Got media stream with ${stream.getTracks().length} tracks`)

      streamRef.current = stream
      setHasPermission(true)
      setScanningStatus("Camera access granted, setting up video...")

      // Wait for video element to be available
      let retries = 0
      const maxRetries = 10

      const setupVideo = async (): Promise<void> => {
        return new Promise((resolve, reject) => {
          const checkVideo = () => {
            if (!videoRef.current) {
              retries++
              if (retries < maxRetries) {
                addLog(`📺 Video element not ready, retry ${retries}/${maxRetries}`)
                setTimeout(checkVideo, 200)
                return
              } else {
                reject(new Error("Video element not available after retries"))
                return
              }
            }

            const video = videoRef.current
            addLog("🎬 Setting up video element...")

            // Set video properties
            video.srcObject = stream
            video.muted = true
            video.playsInline = true
            video.autoplay = true

            const timeout = setTimeout(() => {
              reject(new Error("Video setup timeout"))
            }, 10000)

            video.onloadedmetadata = () => {
              addLog(`📐 Video metadata loaded: ${video.videoWidth}x${video.videoHeight}`)
              setScanningStatus("Video metadata loaded...")
            }

            video.oncanplay = () => {
              addLog("▶️ Video can play, starting playback...")
              clearTimeout(timeout)

              const playPromise = video.play()
              if (playPromise !== undefined) {
                playPromise
                  .then(() => {
                    addLog("🎉 Video playing successfully!")
                    setIsVideoReady(true)
                    setIsScanning(true)
                    setScanningStatus("Camera ready! Point at QR code...")
                    resolve()
                  })
                  .catch((playError) => {
                    addLog(`❌ Video play error: ${playError.message}`)
                    reject(playError)
                  })
              } else {
                addLog("🎉 Video playing (fallback method)")
                setIsVideoReady(true)
                setIsScanning(true)
                setScanningStatus("Camera ready! Point at QR code...")
                resolve()
              }
            }

            video.onerror = (error) => {
              addLog(`❌ Video error: ${error}`)
              clearTimeout(timeout)
              reject(new Error("Video error"))
            }

            // Force load
            video.load()
          }

          checkVideo()
        })
      }

      await setupVideo()
      startQRScanning()
    } catch (error) {
      addLog(`❌ Camera error: ${error instanceof Error ? error.message : String(error)}`)
      setHasPermission(false)
      setIsScanning(false)
      setScanningStatus("Camera access failed")

      let errorMessage = "Please allow camera access to scan QR codes"
      if (error instanceof Error) {
        switch (error.name) {
          case "NotAllowedError":
            errorMessage = "Camera permission denied. Please allow camera access and try again."
            break
          case "NotFoundError":
            errorMessage = "No camera found. Please check your device."
            break
          case "NotReadableError":
            errorMessage = "Camera is being used by another application."
            break
          case "OverconstrainedError":
            errorMessage = "Camera constraints not supported. Trying with basic settings..."
            setTimeout(() => tryBasicCamera(), 1000)
            return
          case "SecurityError":
            errorMessage = "Camera access blocked by browser security policy. Ensure you're using HTTPS."
            break
          default:
            errorMessage = `Camera error: ${error.message}`
        }
      }

      toast({
        title: "Camera Error",
        description: errorMessage,
        variant: "destructive",
      })
    }
  }

  const tryBasicCamera = async () => {
    try {
      addLog("🔄 Trying basic camera constraints...")
      setScanningStatus("Trying basic camera settings...")

      const basicConstraints = { video: true }
      const stream = await navigator.mediaDevices.getUserMedia(basicConstraints)
      addLog("✅ Got basic media stream")

      streamRef.current = stream
      setHasPermission(true)

      if (videoRef.current) {
        const video = videoRef.current
        video.srcObject = stream
        video.muted = true
        video.playsInline = true

        video.oncanplay = () => {
          const playPromise = video.play()
          if (playPromise !== undefined) {
            playPromise
              .then(() => {
                addLog("🎉 Basic video playing!")
                setIsVideoReady(true)
                setIsScanning(true)
                setScanningStatus("Camera ready! Point at QR code...")
                startQRScanning()
              })
              .catch((err) => {
                addLog(`❌ Basic video play error: ${err.message}`)
              })
          }
        }

        video.load()
      }
    } catch (basicError) {
      addLog(`❌ Basic camera also failed: ${basicError instanceof Error ? basicError.message : String(basicError)}`)
      toast({
        title: "Camera Unavailable",
        description: "Unable to access camera with any settings",
        variant: "destructive",
      })
    }
  }

  const startQRScanning = useCallback(() => {
    addLog("🔍 Starting QR scanning...")

    if (!videoRef.current || !canvasRef.current || !isVideoReady) {
      addLog("❌ Video or canvas not ready for scanning")
      return
    }

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext("2d", { willReadFrequently: true })

    if (!context) {
      addLog("❌ No canvas context")
      return
    }

    let scanCount = 0

    const scanQRCode = () => {
      if (!isScanning || !video || video.readyState !== video.HAVE_ENOUGH_DATA) {
        return
      }

      try {
        scanCount++

        canvas.width = video.videoWidth
        canvas.height = video.videoHeight

        if (canvas.width === 0 || canvas.height === 0) {
          return
        }

        context.drawImage(video, 0, 0, canvas.width, canvas.height)
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height)

        const qrCode = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "dontInvert",
        })

        if (qrCode) {
          addLog(`🎯 QR Code detected after ${scanCount} scans: ${qrCode.data.substring(0, 30)}...`)
          setScanningStatus("QR Code detected! Processing...")

          const upiData = parseUPIString(qrCode.data)
          if (upiData) {
            handleQRDetected(upiData)
          } else {
            setScanningStatus("Invalid QR code. Looking for UPI payment codes...")
            setTimeout(() => {
              if (isScanning) {
                setScanningStatus("Camera ready! Point at QR code...")
              }
            }, 2000)
          }
        }

        if (scanCount % 50 === 0) {
          addLog(`🔍 Scanned ${scanCount} frames, video: ${canvas.width}x${canvas.height}`)
        }
      } catch (scanError) {
        addLog(`❌ QR scanning error: ${scanError instanceof Error ? scanError.message : String(scanError)}`)
      }
    }

    addLog("⏰ Starting scan interval...")
    scanIntervalRef.current = setInterval(scanQRCode, 100)
  }, [isScanning, isVideoReady])

  const handleQRDetected = (upiData: UPIData) => {
    addLog(`🎉 QR detected: ${upiData.merchantName}, Amount: ${upiData.amount || "Not specified"}`)
    stopCamera()
    onScanSuccess(upiData)
    toast({
      title: "QR Code Scanned Successfully!",
      description: `Found: ${upiData.merchantName}${upiData.amount ? ` - ₹${upiData.amount}` : ""}`,
    })
  }

  const stopCamera = () => {
    addLog("🛑 Stopping camera...")

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop()
        addLog(`Stopped ${track.kind} track`)
      })
      streamRef.current = null
    }

    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current)
      scanIntervalRef.current = null
    }

    setIsScanning(false)
    setIsVideoReady(false)
    setScanningStatus("Camera stopped")
  }

  const toggleFlash = async () => {
    if (!streamRef.current) return

    try {
      const track = streamRef.current.getVideoTracks()[0]
      const capabilities = track.getCapabilities()

      if ("torch" in capabilities) {
        await track.applyConstraints({
          advanced: [{ torch: !flashOn } as any],
        })
        setFlashOn(!flashOn)
        addLog(`💡 Flash toggled: ${!flashOn ? "ON" : "OFF"}`)
      } else {
        toast({
          title: "Flash Not Supported",
          description: "Your device doesn't support camera flash",
          variant: "destructive",
        })
        addLog("💡 Flash not supported")
      }
    } catch (error) {
      addLog(`❌ Flash error: ${error instanceof Error ? error.message : String(error)}`)
      toast({
        title: "Flash Error",
        description: "Failed to toggle flash",
        variant: "destructive",
      })
    }
  }

  const switchCamera = () => {
    addLog("🔄 Switching camera...")
    stopCamera()
    const newMode = facingMode === "user" ? "environment" : "user"
    setFacingMode(newMode)
    addLog(`📱 New facing mode: ${newMode}`)
    setTimeout(() => {
      startCamera()
    }, 500)
  }

  const handleManualSubmit = () => {
    if (!manualUPI.trim()) {
      toast({
        title: "Empty Input",
        description: "Please enter a UPI payment string",
        variant: "destructive",
      })
      return
    }

    const upiData = parseUPIString(manualUPI)
    if (upiData) {
      onScanSuccess(upiData)
      toast({
        title: "UPI String Parsed!",
        description: `Found: ${upiData.merchantName}`,
      })
    } else {
      toast({
        title: "Invalid UPI String",
        description: "Please enter a valid UPI payment string (upi://pay?pa=...)",
        variant: "destructive",
      })
    }
  }

  const handleClose = () => {
    addLog("🚪 Closing QR scanner...")
    stopCamera()
    onClose()
  }

  const handleDemoQR = () => {
    const demoUPI = "upi://pay?pa=demo@paytm&pn=Demo Restaurant&am=500&cu=INR&tr=DEMO123"
    setManualUPI(demoUPI)
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      addLog("🧹 Component unmounting, cleaning up...")
      stopCamera()
    }
  }, [])

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Scan QR Code</h3>
            <Button variant="ghost" size="sm" onClick={handleClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {!showManualInput ? (
            <div className="space-y-4">
              {!isScanning ? (
                <div className="text-center space-y-4">
                  <div className="w-32 h-32 mx-auto bg-gray-100 rounded-lg flex items-center justify-center">
                    <Camera className="h-12 w-12 text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-600">Position the UPI QR code within the camera frame</p>

                  {hasPermission === false && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-red-500" />
                        <span className="text-sm text-red-700">Camera access required</span>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Button onClick={startCamera} className="w-full" disabled={isScanning}>
                      <Camera className="h-4 w-4 mr-2" />
                      {hasPermission === false ? "Grant Camera Access" : "Start Camera"}
                    </Button>
                    <Button variant="outline" onClick={() => setShowManualInput(true)} className="w-full">
                      <Keyboard className="h-4 w-4 mr-2" />
                      Enter Manually
                    </Button>
                  </div>

                  <div className="text-xs text-gray-500 mt-2">Status: {scanningStatus}</div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="relative">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-64 bg-black rounded-lg object-cover"
                      style={{
                        transform: facingMode === "user" ? "scaleX(-1)" : "none",
                        minHeight: "256px",
                      }}
                    />
                    <canvas ref={canvasRef} className="hidden" />

                    {/* Scanning overlay */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-48 h-48 border-2 border-white rounded-lg relative">
                        <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-green-500 rounded-tl-lg"></div>
                        <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-green-500 rounded-tr-lg"></div>
                        <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-green-500 rounded-bl-lg"></div>
                        <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-green-500 rounded-br-lg"></div>
                      </div>
                    </div>

                    {/* Status overlay */}
                    <div className="absolute bottom-4 left-4 right-4">
                      <div className="bg-black bg-opacity-70 text-white text-xs px-3 py-2 rounded-lg text-center">
                        {scanningStatus}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-center space-x-2">
                    <Button variant="outline" size="sm" onClick={toggleFlash}>
                      {flashOn ? <FlashlightOff className="h-4 w-4" /> : <Flashlight className="h-4 w-4" />}
                    </Button>
                    <Button variant="outline" size="sm" onClick={switchCamera}>
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={stopCamera}>
                      Stop
                    </Button>
                  </div>

                  <div className="text-xs text-gray-500 text-center">
                    Video Ready: {isVideoReady ? "✅" : "❌"} | Facing: {facingMode} | Flash: {flashOn ? "On" : "Off"}
                  </div>
                </div>
              )}

              {/* Debug logs section */}
              <div className="mt-4 p-3 bg-gray-50 rounded-md max-h-32 overflow-y-auto">
                <div className="text-xs font-mono text-gray-700">
                  <div className="font-semibold mb-1">Debug Logs:</div>
                  {debugLogs.length === 0 ? (
                    <div className="text-gray-500">No logs yet...</div>
                  ) : (
                    debugLogs.map((log, index) => (
                      <div key={index} className="mb-1">
                        {log}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <Label htmlFor="manual-upi">UPI Payment String</Label>
                <Input
                  id="manual-upi"
                  placeholder="upi://pay?pa=merchant@bank&pn=Name&am=100..."
                  value={manualUPI}
                  onChange={(e) => setManualUPI(e.target.value)}
                  className="font-mono text-sm"
                />
              </div>

              <Button onClick={handleDemoQR} variant="outline" size="sm" className="w-full bg-transparent">
                <CheckCircle className="h-4 w-4 mr-2" />
                Use Demo UPI String
              </Button>

              <div className="flex space-x-2">
                <Button onClick={handleManualSubmit} className="flex-1">
                  Parse UPI
                </Button>
                <Button variant="outline" onClick={() => setShowManualInput(false)}>
                  Back to Camera
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
