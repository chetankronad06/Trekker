"use client"

import { useState, useEffect } from "react"
import { useUser } from "@clerk/nextjs"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  MapPin,
  Users,
  Camera,
  Shield,
  Zap,
  MessageCircle,
  Star,
  ArrowRight,
  Smartphone,
  Clock,
  Lock,
  Github,
  Linkedin,
  Mail,
  Play,
  CheckCircle,
  TrendingUp,
  Globe,
  X,
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Navbar } from "@/components/navbar"

export default function HomePage() {
  const { isLoaded, isSignedIn } = useUser()
  const router = useRouter()
  const [isVisible, setIsVisible] = useState(false)
  const [showDemo, setShowDemo] = useState(false)
  const [demoStep, setDemoStep] = useState(0)

  useEffect(() => {
    setIsVisible(true)
  }, [])

  const handleGetStarted = () => {
    if (isSignedIn) {
      router.push("/dashboard")
    } else {
      router.push("/sign-up")
    }
  }

  const features = [
    {
      icon: <Camera className="w-8 h-8 text-green-400" />,
      title: "UPI Screenshot Recognition",
      description: "Simply upload payment screenshots and let AI extract all expense details automatically.",
      highlight: true,
    },
    {
      icon: <Clock className="w-8 h-8 text-green-400" />,
      title: "Real-Time Expense Feed",
      description: "See all group expenses instantly as they're added, with live updates for everyone.",
    },
    {
      icon: <MessageCircle className="w-8 h-8 text-green-400" />,
      title: "Group Chat",
      description: "Coordinate with your travel buddies directly within each trip for seamless communication.",
    },
    {
      icon: <Shield className="w-8 h-8 text-green-400" />,
      title: "Timestamp Validation",
      description: "Automatic verification of payment timestamps to ensure accurate expense tracking.",
    },
    {
      icon: <Users className="w-8 h-8 text-green-400" />,
      title: "Secure Trip Grouping",
      description: "Private, invite-only trips with role-based access for handlers and members.",
    },
    {
      icon: <Zap className="w-8 h-8 text-green-400" />,
      title: "Automatic Settlement",
      description: "Smart calculation of who owes what, with easy settlement recommendations.",
      highlight: true,
    },
    {
      icon: <Globe className="w-8 h-8 text-green-400" />,
      title: "Visual Journey Map",
      description: "Track your trip progress with beautiful visual timeline and location mapping.",
    },
    {
      icon: <TrendingUp className="w-8 h-8 text-green-400" />,
      title: "Expense Analytics",
      description: "Detailed insights and analytics on spending patterns and budget tracking.",
    },
  ]

  const steps = [
    {
      step: "1",
      title: "Create & Invite",
      description: "Trip creator makes a trip and shares an invite link with friends",
      icon: <Users className="w-12 h-12 text-green-400" />,
      details:
        "Set up your trip with dates, destination, and budget. Generate a unique invite code to share with your travel companions.",
    },
    {
      step: "2",
      title: "Pay as Usual",
      description: "Members use any UPI app for payments during the trip",
      icon: <Smartphone className="w-12 h-12 text-green-400" />,
      details:
        "Continue using your favorite payment apps - PhonePe, GPay, Paytm, or any UPI app. No need to change your habits.",
    },
    {
      step: "3",
      title: "Upload Screenshot",
      description: "Trekker auto-scans and logs expenses from payment screenshots",
      icon: <Camera className="w-12 h-12 text-green-400" />,
      details:
        "Simply take a screenshot of your payment confirmation and upload it. Our AI extracts all details automatically.",
    },
  ]

  const testimonials = [
    {
      name: "Priya Sharma",
      role: "Travel Enthusiast",
      location: "Mumbai",
      content:
        "Finally, no more Excel sheets for group trips! Trekker made our Goa trip expense tracking effortless. The UPI screenshot feature is a game-changer.",
      rating: 5,
      avatar: "PS",
    },
    {
      name: "Rahul Patel",
      role: "Trip Organizer",
      location: "Delhi",
      content:
        "The UPI screenshot feature is genius. No more asking friends to remember what they paid for. Everything is automatically tracked and categorized.",
      rating: 5,
      avatar: "RP",
    },
    {
      name: "Sneha Reddy",
      role: "Frequent Traveler",
      location: "Bangalore",
      content:
        "Love how secure and private each trip is. Perfect for organizing expenses with different friend groups. The real-time chat is super helpful too!",
      rating: 5,
      avatar: "SR",
    },
  ]

  const demoSteps = [
    {
      title: "Trip Creation",
      description: "Create a new trip with your friends",
      image: "/placeholder.svg?height=300&width=400",
    },
    {
      title: "Expense Feed",
      description: "Real-time expense tracking",
      image: "/placeholder.svg?height=300&width=400",
    },
    {
      title: "Screenshot Upload",
      description: "Upload UPI screenshots for automatic processing",
      image: "/placeholder.svg?height=300&width=400",
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-green-500/10 to-blue-500/10 opacity-50" />
        <div className="container mx-auto px-4 py-20 lg:py-32 relative">
          <div
            className={`text-center transition-all duration-1000 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
          >
            <Badge className="mb-6 bg-green-500/20 text-green-400 border-green-500/50 px-4 py-2 text-sm">
              🚀 Smart Expense Tracking for Group Trips
            </Badge>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent">
              Split Trip Expenses
              <br />
              <span className="bg-gradient-to-r from-green-400 to-green-500 bg-clip-text text-transparent">
                The Smart Way
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-400 mb-8 max-w-4xl mx-auto leading-relaxed">
              Upload UPI screenshots, let AI handle the math. No more awkward money conversations or complex
              spreadsheets.
              <br className="hidden md:block" />
              <span className="text-green-400 font-semibold">Just pure travel joy.</span>
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
              <Button
                onClick={handleGetStarted}
                size="lg"
                className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-8 py-4 text-lg shadow-lg shadow-green-500/25"
              >
                {isSignedIn ? "Go to Dashboard" : "Start Your First Trip"}
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <Button
                onClick={() => setShowDemo(true)}
                variant="outline"
                size="lg"
                className="border-gray-600 text-gray-300 hover:bg-gray-700 bg-transparent px-8 py-4 text-lg"
              >
                <Play className="mr-2 w-5 h-5" />
                Watch Demo
              </Button>
            </div>
            <div className="flex items-center justify-center gap-8 text-sm text-gray-400">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-400" />
                Free to use
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-400" />
                No bank details required
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-400" />
                Secure & Private
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 lg:py-32">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-blue-500/20 text-blue-400 border-blue-500/50">How It Works</Badge>
            <h2 className="text-3xl md:text-5xl font-bold mb-6 text-white">Three Simple Steps</h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Revolutionize your group trip expense management in just three easy steps
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
            {steps.map((step, index) => (
              <Card
                key={index}
                className="bg-gray-800/50 backdrop-blur-sm border-gray-700 text-center relative group hover:border-green-500/50 transition-all duration-300"
              >
                <CardHeader className="pb-4">
                  <div className="mx-auto mb-4 w-20 h-20 bg-gradient-to-r from-green-500/20 to-green-600/20 rounded-full flex items-center justify-center border border-green-500/30 group-hover:scale-110 transition-transform duration-300">
                    {step.icon}
                  </div>
                  <div className="absolute -top-4 -right-4 w-8 h-8 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center text-white font-bold shadow-lg">
                    {step.step}
                  </div>
                  <CardTitle className="text-xl text-white mb-2">{step.title}</CardTitle>
                  <p className="text-gray-400 text-sm">{step.description}</p>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-500 text-xs leading-relaxed">{step.details}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Live Demo Section */}
      <section className="py-20 lg:py-32 bg-gray-900/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-purple-500/20 text-purple-400 border-purple-500/50">Live Preview</Badge>
            <h2 className="text-3xl md:text-5xl font-bold mb-6 text-white">See It In Action</h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Experience how Trekker simplifies group expense tracking
            </p>
          </div>
          <div className="max-w-4xl mx-auto">
            <Card className="bg-gray-800/50 backdrop-blur-sm border-gray-700 overflow-hidden">
              <CardContent className="p-0">
                <div className="aspect-video bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                  <Button
                    onClick={() => setShowDemo(true)}
                    size="lg"
                    className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white"
                  >
                    <Play className="mr-2 w-6 h-6" />
                    Watch Interactive Demo
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Core Features */}
      <section id="features" className="py-20 lg:py-32">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-green-500/20 text-green-400 border-green-500/50">Features</Badge>
            <h2 className="text-3xl md:text-5xl font-bold mb-6 text-white">Powerful Features</h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Everything you need to manage group expenses effortlessly
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <Card
                key={index}
                className={`bg-gray-800/50 backdrop-blur-sm border-gray-700 hover:border-green-500/50 transition-all duration-300 ${
                  feature.highlight ? "ring-1 ring-green-500/20" : ""
                }`}
              >
                <CardHeader>
                  <div className="mb-4 relative">
                    {feature.icon}
                    {feature.highlight && (
                      <Badge className="absolute -top-2 -right-2 bg-green-500/20 text-green-400 border-green-500/50 text-xs px-2 py-1">
                        Popular
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-white text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-400 text-sm">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Security & Privacy */}
      <section className="py-20 lg:py-32 bg-gray-900/50">
        <div className="container mx-auto px-4">
          <Card className="bg-gradient-to-r from-gray-800/50 to-gray-900/50 backdrop-blur-sm border-gray-700 max-w-5xl mx-auto">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 w-16 h-16 bg-gradient-to-r from-green-500/20 to-green-600/20 rounded-full flex items-center justify-center border border-green-500/30">
                <Lock className="w-8 h-8 text-green-400" />
              </div>
              <Badge className="mb-4 bg-red-500/20 text-red-400 border-red-500/50">Security First</Badge>
              <CardTitle className="text-2xl md:text-3xl text-white mb-4">Your Privacy Matters</CardTitle>
              <CardDescription className="text-lg text-gray-400 max-w-2xl mx-auto">
                We understand you're sharing financial information. Here's how we keep it secure.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <Shield className="w-10 h-10 text-green-400 mx-auto mb-4" />
                <h3 className="font-semibold text-white mb-3">No Bank Login Info</h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  We never ask for or store your banking credentials, passwords, or sensitive login information.
                </p>
              </div>
              <div className="text-center">
                <Camera className="w-10 h-10 text-green-400 mx-auto mb-4" />
                <h3 className="font-semibold text-white mb-3">OCR Only Processing</h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  Screenshots are processed for text extraction only, then securely handled and never shared.
                </p>
              </div>
              <div className="text-center">
                <Users className="w-10 h-10 text-green-400 mx-auto mb-4" />
                <h3 className="font-semibold text-white mb-3">Private Group Data</h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  All trip data is private to your group members only. No third-party access ever.
                </p>
              </div>
            </CardContent>
            <div className="text-center mt-8 pb-6">
              <Link href="/privacy" className="text-green-400 hover:text-green-300 underline">
                Read our Privacy Policy →
              </Link>
            </div>
          </Card>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 lg:py-32">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-yellow-500/20 text-yellow-400 border-yellow-500/50">Testimonials</Badge>
            <h2 className="text-3xl md:text-5xl font-bold mb-6 text-white">What Travelers Say</h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Join thousands of happy travelers who've simplified their group expenses
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card
                key={index}
                className="bg-gray-800/50 backdrop-blur-sm border-gray-700 hover:border-green-500/30 transition-all duration-300"
              >
                <CardHeader>
                  <div className="flex items-center gap-1 mb-3">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-gray-300 italic leading-relaxed">"{testimonial.content}"</p>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center text-white font-semibold">
                      {testimonial.avatar}
                    </div>
                    <div>
                      <p className="font-semibold text-white">{testimonial.name}</p>
                      <p className="text-sm text-gray-400">
                        {testimonial.role} • {testimonial.location}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 lg:py-32 bg-gradient-to-r from-green-500/10 to-blue-500/10">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-4xl mx-auto">
            <Badge className="mb-6 bg-green-500/20 text-green-400 border-green-500/50 px-4 py-2">
              📍 Trip Planned? Start Tracking Now!
            </Badge>
            <h2 className="text-3xl md:text-5xl font-bold mb-6 text-white">Ready to Start Your Journey?</h2>
            <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
              Join thousands of travelers who've made group expense tracking effortless. Start your first trip today and
              experience the difference.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button
                onClick={handleGetStarted}
                size="lg"
                className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-12 py-6 text-xl shadow-lg shadow-green-500/25"
              >
                {isSignedIn ? "Go to Dashboard" : "Start Tracking Now"}
                <ArrowRight className="ml-3 w-6 h-6" />
              </Button>
              {!isSignedIn && (
                <Button
                  onClick={() => router.push("/sign-in")}
                  variant="outline"
                  size="lg"
                  className="border-gray-600 text-gray-300 hover:bg-gray-700 bg-transparent px-8 py-6 text-lg"
                >
                  Already have an account? Sign In
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 bg-gray-900/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-12">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
              <Link href="/" className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold bg-gradient-to-r from-green-400 to-green-500 bg-clip-text text-transparent">
                  Trekker
                </span>
              </Link>
              <p className="text-gray-400 mb-6 max-w-md leading-relaxed">
                Smart expense tracking for group trips. Upload UPI screenshots, let AI handle the math. Make your travel
                memories, not expense headaches.
              </p>
              <div className="flex space-x-4">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-gray-400 hover:text-green-400 hover:bg-green-500/10"
                >
                  <Github className="w-5 h-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-gray-400 hover:text-green-400 hover:bg-green-500/10"
                >
                  <Linkedin className="w-5 h-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-gray-400 hover:text-green-400 hover:bg-green-500/10"
                >
                  <Mail className="w-5 h-5" />
                </Button>
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-4">Product</h3>
              <ul className="space-y-3 text-gray-400">
                <li>
                  <Link href="/#features" className="hover:text-green-400 transition-colors">
                    Features
                  </Link>
                </li>
                <li>
                  <Link href="/#how-it-works" className="hover:text-green-400 transition-colors">
                    How It Works
                  </Link>
                </li>
                <li>
                  <Link href="/pricing" className="hover:text-green-400 transition-colors">
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link href="/security" className="hover:text-green-400 transition-colors">
                    Security
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-4">Legal</h3>
              <ul className="space-y-3 text-gray-400">
                <li>
                  <Link href="/privacy" className="hover:text-green-400 transition-colors">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="hover:text-green-400 transition-colors">
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="hover:text-green-400 transition-colors">
                    Contact Us
                  </Link>
                </li>
                <li>
                  <Link href="/support" className="hover:text-green-400 transition-colors">
                    Support
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-400">
            <p>&copy; 2025 Trekker. All rights reserved. Made with ❤️ for travelers worldwide.</p>
          </div>
        </div>
      </footer>

      {/* Demo Modal */}
      <Dialog open={showDemo} onOpenChange={setShowDemo}>
        <DialogContent className="max-w-4xl bg-gray-800/95 backdrop-blur-sm border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center justify-between">
              Interactive Demo
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowDemo(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex justify-center space-x-2 mb-4">
              {demoSteps.map((_, index) => (
                <Button
                  key={index}
                  variant={demoStep === index ? "default" : "outline"}
                  size="sm"
                  onClick={() => setDemoStep(index)}
                  className={demoStep === index ? "bg-green-500 text-white" : "border-gray-600 text-gray-300"}
                >
                  {index + 1}
                </Button>
              ))}
            </div>
            <Card className="bg-gray-900/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">{demoSteps[demoStep].title}</CardTitle>
                <CardDescription className="text-gray-400">{demoSteps[demoStep].description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="aspect-video bg-gray-800 rounded-lg flex items-center justify-center">
                  <img
                    src={demoSteps[demoStep].image || "/placeholder.svg"}
                    alt={demoSteps[demoStep].title}
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
              </CardContent>
            </Card>
            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => setDemoStep(Math.max(0, demoStep - 1))}
                disabled={demoStep === 0}
                className="border-gray-600 text-gray-300"
              >
                Previous
              </Button>
              <Button
                onClick={() => setDemoStep(Math.min(demoSteps.length - 1, demoStep + 1))}
                disabled={demoStep === demoSteps.length - 1}
                className="bg-green-500 text-white"
              >
                Next
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
