"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  Car,
  MapPin,
  Clock,
  CreditCard,
  Shield,
  Star,
  Menu,
  X,
  Search,
  CheckCircle,
  DollarSign,
  ThumbsUp,
  Zap,
  History,
  Map,
  ChevronUp,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger, SheetClose } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import { useIsMobile } from "@/hooks/use-mobile"
import { Typewriter } from "@/components/ui/typewriter"
import { CountUp } from "@/components/ui/count-up"

export default function LandingPage() {
  const router = useRouter()
  const isMobile = useIsMobile()
  const [showScrollTop, setShowScrollTop] = useState(false)

  // Check scroll position to show/hide scroll to top button
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 500)
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  // Initialize AOS-style animations
  useEffect(() => {
    // Function to check if an element is in viewport
    const isInViewport = (element) => {
      const rect = element.getBoundingClientRect()
      return rect.top <= (window.innerHeight || document.documentElement.clientHeight) * 0.75 && rect.bottom >= 0
    }

    // Function to handle scroll and animate elements
    const handleScrollAnimation = () => {
      const animElements = document.querySelectorAll("[data-aos]")

      animElements.forEach((element) => {
        if (isInViewport(element) && !element.classList.contains("aos-animate")) {
          element.classList.add("aos-animate")
        } else if (!isInViewport(element) && element.classList.contains("aos-animate")) {
          // Remove animation class when element is out of viewport to re-animate on scroll up
          element.classList.remove("aos-animate")
        }
      })
    }

    // Initial check
    handleScrollAnimation()

    // Add scroll event listener
    window.addEventListener("scroll", handleScrollAnimation)

    return () => {
      window.removeEventListener("scroll", handleScrollAnimation)
    }
  }, [])

  // Scroll to top function
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    })
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Add CSS for animations */}
      <style jsx global>{`
        [data-aos] {
          opacity: 0;
          transition-property: opacity, transform;
          transition-duration: 800ms;
          transition-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
        }
        
        [data-aos="fade-up"].aos-animate {
          opacity: 1;
          transform: translateY(0);
        }
        [data-aos="fade-up"] {
          transform: translateY(40px);
        }
        
        [data-aos="fade-down"].aos-animate {
          opacity: 1;
          transform: translateY(0);
        }
        [data-aos="fade-down"] {
          transform: translateY(-40px);
        }
        
        [data-aos="fade-right"].aos-animate {
          opacity: 1;
          transform: translateX(0);
        }
        [data-aos="fade-right"] {
          transform: translateX(-60px);
        }
        
        [data-aos="fade-left"].aos-animate {
          opacity: 1;
          transform: translateX(0);
        }
        [data-aos="fade-left"] {
          transform: translateX(60px);
        }
        
        [data-aos="zoom-in"].aos-animate {
          opacity: 1;
          transform: scale(1);
        }
        [data-aos="zoom-in"] {
          transform: scale(0.9);
        }
      `}</style>

      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center space-x-2 z-10">
            <div className="relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-primary/40 rounded-full blur-sm"></div>
              <Car className="h-6 w-6 text-primary relative" />
            </div>
            <span className="text-xl font-bold">Space4Wheels</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex space-x-8">
            {["Features", "How It Works", "For Plot Owners", "Why Us"].map((item, index) => (
              <Link
                key={index}
                href={`#${item.toLowerCase().replace(/\s+/g, "-")}`}
                className="text-sm font-medium hover:text-primary transition-colors relative group"
              >
                {item}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary group-hover:w-full transition-all duration-300"></span>
              </Link>
            ))}
          </nav>

          <div className="hidden md:flex items-center space-x-4">
            <Link href="/auth/login">
              <Button variant="outline" className="transition-all duration-300 hover:border-primary/50">
                Log In
              </Button>
            </Link>
            <Link href="/auth/signup">
              <Button className="transition-all duration-300 hover:bg-primary/90 hover:scale-105">Sign Up</Button>
            </Link>
          </div>

          {/* Mobile Navigation */}
          <Sheet>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right">
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center space-x-2">
                    <Car className="h-5 w-5 text-primary" />
                    <span className="text-lg font-bold">Space4Wheels</span>
                  </div>
                  <SheetClose asChild>
                    <Button variant="ghost" size="icon">
                      <X className="h-4 w-4" />
                      <span className="sr-only">Close</span>
                    </Button>
                  </SheetClose>
                </div>
                <nav className="flex flex-col space-y-4">
                  {["Features", "How It Works", "For Plot Owners", "Why Us"].map((item, index) => (
                    <SheetClose key={index} asChild>
                      <Link
                        href={`#${item.toLowerCase().replace(/\s+/g, "-")}`}
                        className="text-base font-medium hover:text-primary transition-colors"
                      >
                        {item}
                      </Link>
                    </SheetClose>
                  ))}
                </nav>
                <div className="mt-auto space-y-4">
                  <SheetClose asChild>
                    <Link href="/auth/login" className="block">
                      <Button variant="outline" className="w-full">
                        Log In
                      </Button>
                    </Link>
                  </SheetClose>
                  <SheetClose asChild>
                    <Link href="/auth/signup" className="block">
                      <Button className="w-full">Sign Up</Button>
                    </Link>
                  </SheetClose>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      <main className="flex-1 pt-16">
        {/* Hero Section */}
        <section className="relative h-[90vh] flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-background via-background/90 to-primary/5 z-0"></div>

          {/* Background elements */}
          <div className="absolute inset-0 z-10 overflow-hidden">
            <div className="absolute bottom-0 left-0 right-0 h-[20vh] bg-muted/20"></div>
          </div>

          {/* Content */}
          <div className="container mx-auto px-4 relative z-30">
            <div className="max-w-4xl mx-auto text-center">
              <div data-aos="fade-up" data-aos-duration="800" className="mb-6">
                <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/80">
                  <Typewriter text="Park Instantly" speed={80} />
                </h1>
              </div>

              <div data-aos="fade-up" data-aos-duration="800" data-aos-delay="200" className="mb-8">
                <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto">
                  Say goodbye to circling the block. Find spots in real time and park stress-free.
                </p>
              </div>

              <div
                data-aos="fade-up"
                data-aos-duration="800"
                data-aos-delay="400"
                className="flex flex-col sm:flex-row justify-center gap-4"
              >
                <Link href="/auth/signup">
                  <Button
                    size="lg"
                    className="w-full sm:w-auto transition-all duration-300 hover:scale-105 hover:shadow-md"
                  >
                    Find Parking
                    <MapPin className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/auth/signup?role=owner">
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full sm:w-auto transition-all duration-300 hover:bg-primary/10"
                  >
                    List Your Plot
                  </Button>
                </Link>
              </div>

              <div
                data-aos="fade-up"
                data-aos-duration="800"
                data-aos-delay="600"
                className="mt-12 flex justify-center space-x-8"
              >
                {[
                  { count: "10K", label: "Parking Spots" },
                  { count: "50", label: "Cities" },
                  { count: "100K", label: "Happy Users" },
                ].map((stat, index) => (
                  <div key={index} className="flex flex-col items-center">
                    <div className="text-3xl font-bold text-primary">
                      <CountUp
                        end={Number.parseInt(stat.count.replace(/\D/g, ""))}
                        suffix={stat.count.includes("K") ? "K+" : "+"}
                      />
                    </div>
                    <div className="text-sm text-muted-foreground">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section id="how-it-works" className="py-24 relative overflow-hidden">
          <div className="container mx-auto px-4">
            <div data-aos="fade-up" className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4 relative inline-block">
                How It Works
                <span className="absolute -bottom-2 left-0 right-0 h-1 bg-primary/30 rounded-full"></span>
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Finding and booking parking has never been easier. Just follow these simple steps.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-16">
              {/* For Drivers */}
              <div
                data-aos="fade-right"
                data-aos-duration="800"
                className="bg-background rounded-xl border p-8 shadow-sm transition-all duration-300 hover:shadow-lg"
              >
                <div className="flex items-center mb-6 relative">
                  <div className="mr-3 bg-primary/10 p-2 rounded-full transition-transform duration-300 hover:rotate-12">
                    <Car className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-2xl font-bold">For Drivers</h3>
                </div>
                <div className="space-y-8 relative">
                  {[
                    {
                      number: 1,
                      title: "Search nearby available parking",
                      description:
                        "Enter your destination or use your current location to find available parking spots nearby.",
                      icon: <Search className="h-5 w-5" />,
                      delay: 0,
                    },
                    {
                      number: 2,
                      title: "Choose time slot and book",
                      description:
                        "Browse through options, compare prices, read reviews, and select the perfect spot for your needs.",
                      icon: <Clock className="h-5 w-5" />,
                      delay: 200,
                    },
                    {
                      number: 3,
                      title: "Navigate and park easily",
                      description:
                        "Follow the directions to your reserved spot and enjoy stress-free parking for the duration of your booking.",
                      icon: <MapPin className="h-5 w-5" />,
                      delay: 400,
                    },
                  ].map((step, index) => (
                    <div
                      key={index}
                      data-aos="fade-right"
                      data-aos-delay={step.delay}
                      className="flex items-start gap-4 group"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform duration-300 hover:scale-110">
                        {step.icon ? step.icon : step.number}
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold mb-2 group-hover:text-primary transition-colors duration-300">
                          {step.title}
                        </h3>
                        <p className="text-muted-foreground">{step.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* For Plot Owners */}
              <div
                data-aos="fade-left"
                data-aos-duration="800"
                data-aos-delay="200"
                className="bg-background rounded-xl border p-8 shadow-sm transition-all duration-300 hover:shadow-lg"
              >
                <div className="flex items-center mb-6 relative">
                  <div className="mr-3 bg-primary/10 p-2 rounded-full transition-transform duration-300 hover:rotate-12">
                    <MapPin className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-2xl font-bold">For Plot Owners</h3>
                </div>
                <div className="space-y-8 relative">
                  {[
                    {
                      number: 1,
                      title: "Add your empty plot",
                      description:
                        "Register your unused space, add photos, and set up your listing with just a few clicks.",
                      icon: <MapPin className="h-5 w-5" />,
                      delay: 0,
                    },
                    {
                      number: 2,
                      title: "Set pricing and availability",
                      description:
                        "Choose when your space is available and how much you want to charge for different time slots.",
                      icon: <DollarSign className="h-5 w-5" />,
                      delay: 200,
                    },
                    {
                      number: 3,
                      title: "Start earning effortlessly",
                      description:
                        "Receive bookings, approve requests, and get paid automatically through our secure platform.",
                      icon: <CreditCard className="h-5 w-5" />,
                      delay: 400,
                    },
                  ].map((step, index) => (
                    <div
                      key={index}
                      data-aos="fade-left"
                      data-aos-delay={step.delay}
                      className="flex items-start gap-4 group"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform duration-300 hover:scale-110">
                        {step.icon ? step.icon : step.number}
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold mb-2 group-hover:text-primary transition-colors duration-300">
                          {step.title}
                        </h3>
                        <p className="text-muted-foreground">{step.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-24 bg-muted/30 relative">
          <div className="container mx-auto px-4">
            <div data-aos="fade-up" className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4 relative inline-block">
                Key Features
                <span className="absolute -bottom-2 left-0 right-0 h-1 bg-primary/30 rounded-full"></span>
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Everything you need to find and book the perfect parking spot, all in one place.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                {
                  icon: <Search />,
                  title: "Real-time Availability",
                  description:
                    "Know exactly what's open before heading out, with live updates on parking availability.",
                  highlighted: false,
                  delay: 0,
                  direction: "right",
                },
                {
                  icon: <Zap />,
                  title: "Seamless Booking",
                  description: "Secure spots with instant confirmation and hassle-free payment processing.",
                  highlighted: true,
                  delay: 100,
                  direction: "up",
                },
                {
                  icon: <Map />,
                  title: "Map View",
                  description: "Visualize plots on an interactive map or browse through a convenient list view.",
                  highlighted: false,
                  delay: 200,
                  direction: "left",
                },
                {
                  icon: <MapPin />,
                  title: "Location-based",
                  description:
                    "Find the closest parking wherever you are with our smart location-based recommendations.",
                  highlighted: false,
                  delay: 300,
                  direction: "right",
                },
                {
                  icon: <History />,
                  title: "Booking History",
                  description: "Keep track of your past and upcoming reservations for easy reference and reuse.",
                  highlighted: false,
                  delay: 400,
                  direction: "up",
                },
                {
                  icon: <Star />,
                  title: "Ratings & Reviews",
                  description: "Know what to expect from each location with honest feedback from other drivers.",
                  highlighted: false,
                  delay: 500,
                  direction: "left",
                },
              ].map((feature, index) => (
                <div
                  key={index}
                  data-aos={`fade-${feature.direction}`}
                  data-aos-delay={feature.delay}
                  className={cn(
                    "group relative overflow-hidden rounded-xl border p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-1",
                    feature.highlighted ? "bg-primary text-primary-foreground" : "bg-background",
                  )}
                >
                  {feature.highlighted && (
                    <div className="absolute -right-10 -top-10 z-0 h-24 w-24 rounded-full bg-primary-foreground/10 blur-xl" />
                  )}

                  <div className="relative z-10">
                    <div
                      className={cn(
                        "mb-4 flex h-12 w-12 items-center justify-center rounded-full transition-transform duration-300 hover:scale-110",
                        feature.highlighted
                          ? "bg-primary-foreground/20 text-primary-foreground"
                          : "bg-primary/10 text-primary",
                      )}
                    >
                      {feature.icon}
                    </div>
                    <h3 className="mb-2 text-xl font-semibold">{feature.title}</h3>
                    <p
                      className={cn(
                        "text-sm",
                        feature.highlighted ? "text-primary-foreground/90" : "text-muted-foreground",
                      )}
                    >
                      {feature.description}
                    </p>

                    <div
                      className={cn(
                        "mt-4 h-1 w-0 rounded-full group-hover:w-full transition-all duration-300",
                        feature.highlighted ? "bg-primary-foreground/30" : "bg-primary/30",
                      )}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Plot Owners Section */}
        <section id="for-plot-owners" className="py-24 relative">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-primary/10 z-0"></div>
          <div className="container mx-auto px-4 relative z-10">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div data-aos="fade-right" data-aos-duration="800">
                <h2 className="text-3xl md:text-4xl font-bold mb-6 relative inline-block">
                  Earn With Your Empty Plot
                  <span className="absolute -bottom-2 left-0 right-0 h-1 bg-primary/30 rounded-full"></span>
                </h2>
                <p className="text-xl mb-8 text-muted-foreground">
                  Have an empty space? Turn it into a revenue stream.
                </p>

                <ul className="space-y-4 mb-8">
                  {[
                    { icon: <DollarSign />, text: "Set your own price and maximize your earnings" },
                    { icon: <CheckCircle />, text: "Approve or reject bookings based on your preferences" },
                    { icon: <CreditCard />, text: "Get paid securely through our trusted payment system" },
                  ].map((item, index) => (
                    <li key={index} data-aos="fade-right" data-aos-delay={index * 100} className="flex items-start">
                      <div className="h-6 w-6 text-primary mr-3 mt-0.5 transition-transform duration-300 hover:scale-110">
                        {item.icon}
                      </div>
                      <span>{item.text}</span>
                    </li>
                  ))}
                </ul>

                <div data-aos="fade-up" data-aos-delay="300" className="mt-8">
                  <Link href="/auth/signup?role=owner">
                    <Button size="lg" className="transition-all duration-300 hover:scale-105 hover:shadow-md">
                      Become a Host
                    </Button>
                  </Link>
                </div>
              </div>

              <div data-aos="fade-left" data-aos-duration="800" data-aos-delay="200">
                <div className="bg-background rounded-xl border shadow-lg p-6 transition-all duration-300 hover:shadow-xl">
                  <h3 className="text-xl font-bold mb-6">What Our Plot Owners Say</h3>

                  <div className="space-y-6">
                    {[
                      {
                        quote:
                          "I'm making an extra $400 per month from my driveway that used to sit empty all day while I was at work.",
                        author: "Rahul M.",
                        initial: "R",
                      },
                      {
                        quote:
                          "My empty lot near the shopping district now generates enough income to cover my property taxes for the entire year!",
                        author: "Priya S.",
                        initial: "P",
                      },
                    ].map((testimonial, index) => (
                      <div
                        key={index}
                        data-aos="fade-left"
                        data-aos-delay={index * 100}
                        className="bg-muted/50 p-4 rounded-lg transition-all duration-300 hover:bg-muted/70 hover:-translate-y-1"
                      >
                        <p className="italic mb-3">"{testimonial.quote}"</p>
                        <div className="flex items-center">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold transition-transform duration-300 hover:scale-110">
                            {testimonial.initial}
                          </div>
                          <span className="ml-2 font-medium">{testimonial.author}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div
                    data-aos="fade-up"
                    data-aos-delay="300"
                    className="mt-6 p-4 border border-dashed rounded-lg transition-all duration-300 hover:border-primary/50 hover:shadow-sm"
                  >
                    <h4 className="font-semibold mb-2">Potential Monthly Earnings</h4>
                    <div className="flex justify-between items-center">
                      <span>Single Parking Spot:</span>
                      <span className="font-bold">₹3,000 - ₹8,000</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Small Lot (5-10 spots):</span>
                      <span className="font-bold">₹15,000 - ₹40,000</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Why Space4Wheels Section */}
        <section id="why-us" className="py-24 bg-muted/30 relative">
          <div className="container mx-auto px-4">
            <div data-aos="fade-up" className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4 relative inline-block">
                Why Space4Wheels?
                <span className="absolute -bottom-2 left-0 right-0 h-1 bg-primary/30 rounded-full"></span>
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                We're building the future of urban parking with a platform you can trust.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                {
                  icon: <ThumbsUp />,
                  title: "Trusted by 1,000+ users",
                  description:
                    "Join our growing community of satisfied drivers and plot owners across multiple cities.",
                  delay: 0,
                  direction: "right",
                },
                {
                  icon: <Shield />,
                  title: "Secure and instant payments",
                  description:
                    "Our payment system ensures that all transactions are protected and processed immediately.",
                  delay: 100,
                  direction: "up",
                },
                {
                  icon: <Star />,
                  title: "Transparent reviews and ratings",
                  description: "Real feedback from real users helps you make informed decisions about where to park.",
                  delay: 200,
                  direction: "left",
                },
                {
                  icon: <Clock />,
                  title: "24/7 support",
                  description: "Our customer service team is always available to help with any issues or questions.",
                  delay: 300,
                  direction: "right",
                },
                {
                  icon: <Zap />,
                  title: "Built for urban convenience",
                  description: "Designed specifically to solve the challenges of parking in busy urban environments.",
                  delay: 400,
                  direction: "up",
                },
              ].map((item, index) => (
                <div
                  key={index}
                  data-aos={`fade-${item.direction}`}
                  data-aos-delay={item.delay}
                  className="bg-background rounded-xl border p-6 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-1"
                >
                  <div className="flex items-center mb-4">
                    <div className="h-6 w-6 text-primary mr-3 transition-transform duration-300 hover:scale-110">
                      {item.icon}
                    </div>
                    <h3 className="text-xl font-semibold">{item.title}</h3>
                  </div>
                  <p className="text-muted-foreground">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 relative">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-primary/20 z-0"></div>
          <div className="container mx-auto px-4 relative z-10">
            <div data-aos="fade-up" className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to park smarter?</h2>
              <p className="text-xl text-muted-foreground mb-8">Don't wait — spots go fast!</p>
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <Link href="/auth/signup">
                  <Button
                    size="lg"
                    className="w-full sm:w-auto transition-all duration-300 hover:scale-105 hover:shadow-md"
                  >
                    Get Started
                  </Button>
                </Link>
                <Link href="/auth/signup?role=owner">
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full sm:w-auto transition-all duration-300 hover:bg-primary/10"
                  >
                    List Your Plot
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-12 bg-background">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="transition-transform duration-300 hover:rotate-12">
                  <Car className="h-6 w-6 text-primary" />
                </div>
                <span className="text-xl font-bold">Space4Wheels</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Making parking simple, efficient, and stress-free for everyone.
              </p>
            </div>

            {[
              {
                title: "Company",
                links: ["About Us", "Careers", "Press", "Blog"],
              },
              {
                title: "Support",
                links: ["Help Center", "Contact Us", "Privacy Policy", "Terms of Service"],
              },
              {
                title: "Download",
                links: ["iOS App", "Android App"],
              },
            ].map((section, sectionIndex) => (
              <div key={sectionIndex}>
                <h3 className="font-semibold mb-4">{section.title}</h3>
                <ul className="space-y-2">
                  {section.links.map((link, linkIndex) => (
                    <li key={linkIndex}>
                      <Link
                        href="#"
                        className="text-sm text-muted-foreground hover:text-primary transition-colors relative group"
                      >
                        {link}
                        <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary/30 group-hover:w-full transition-all duration-300"></span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="border-t mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
            <div className="text-sm text-muted-foreground mb-4 md:mb-0">
              © {new Date().getFullYear()} Space4Wheels. All rights reserved.
            </div>
            <div className="flex space-x-6">
              {["Facebook", "Instagram", "Twitter"].map((social, index) => (
                <Link key={index} href="#" className="text-muted-foreground hover:text-primary transition-colors">
                  <span className="sr-only">{social}</span>
                  {social === "Facebook" && (
                    <svg
                      className="h-5 w-5 transition-transform duration-300 hover:scale-110"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                  {social === "Instagram" && (
                    <svg
                      className="h-5 w-5 transition-transform duration-300 hover:scale-110"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                  {social === "Twitter" && (
                    <svg
                      className="h-5 w-5 transition-transform duration-300 hover:scale-110"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                    </svg>
                  )}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </footer>

      {/* Scroll to top button */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 p-3 rounded-full bg-primary text-primary-foreground shadow-lg z-50 transition-all duration-300 hover:scale-110 hover:shadow-xl"
        >
          <ChevronUp className="h-5 w-5" />
        </button>
      )}
    </div>
  )
}
