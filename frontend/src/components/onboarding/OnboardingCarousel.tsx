import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

interface Slide {
  image: string
  title: string
  description: string
}

const slides: Slide[] = [
  {
    image: '/slide1.png',
    title: 'Discover Local Stores',
    description: 'Find sari-sari stores near you with the items you need. Search, browse, and connect with local businesses in your area.'
  },
  {
    image: '/slide2.png',
    title: 'Request Products',
    description: 'Can\'t find what you\'re looking for? Send a request to store owners and get notified when items become available.'
  },
  {
    image: '/slide3.png',
    title: 'Start Exploring',
    description: 'Ready to discover your neighborhood? Click the button below to start exploring the map and find stores near you.'
  }
]

export function OnboardingCarousel() {
  const [currentSlide, setCurrentSlide] = useState(0)
  const navigate = useNavigate()

  const goToNextSlide = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide((prev) => prev + 1)
    }
  }

  const goToSlide = (index: number) => {
    if (index === currentSlide) return
    setCurrentSlide(index)
  }

  const handleShowMap = () => {
    localStorage.setItem('onboardingCompleted', 'true')
    navigate('/map')
  }

  const isLastSlide = currentSlide === slides.length - 1

  return (
    <div className="fixed inset-0 bg-black flex flex-col">
      {/* Image Container */}
      <div className="relative flex-1 overflow-hidden">
        {/* Slide 1 */}
     {currentSlide === 0 && (
          <div key={`slide1-${currentSlide}`} className="absolute inset-0 animate-fade-in">
            <img
              src="/slide1.png"
              alt="Discover Local Stores"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/40" />
          </div>
        )}

        {/* Slide 2 */}
     {currentSlide === 1 && (
          <div key={`slide2-${currentSlide}`} className="absolute inset-0 animate-fade-in">
            <img
              src="/slide2.png"
              alt="Request Products"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/40" />
          </div>
        )}

        {/* Slide 3 */}
           {currentSlide === 2 && (
          <div key={`slide3-${currentSlide}`} className="absolute inset-0 animate-fade-in">
            <img
              src="/slide3.png"
              alt="Start Exploring"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/40" />
          </div>
        )}

        {/* Text Content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center text-white">
          <h1 className="text-4xl md:text-6xl font-bold mb-4 drop-shadow-lg">
            {slides[currentSlide].title}
          </h1>
          <p className="text-lg md:text-xl max-w-2xl drop-shadow-md mb-8">
            {slides[currentSlide].description}
          </p>

          {/* Next Button - Only on slides 1 and 2 */}
          {!isLastSlide && (
            <button
              onClick={goToNextSlide}
              className="px-8 py-4 bg-emerald-500 hover:bg-emerald-600 text-white text-lg font-semibold rounded-full shadow-xl transition-all transform hover:scale-105"
            >
              Next
            </button>
          )}

          {/* Show Map Button - Only on last slide */}
          {isLastSlide && (
            <button
              onClick={handleShowMap}
              className="px-8 py-4 bg-emerald-500 hover:bg-emerald-600 text-white text-lg font-semibold rounded-full shadow-xl transition-all transform hover:scale-105"
            >
              Show Map
            </button>
          )}
        </div>
      </div>

      {/* Dot Controls */}
      <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-3">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={`w-3 h-3 rounded-full transition-all ${
              index === currentSlide
                ? 'bg-white scale-125'
                : 'bg-white/50 hover:bg-white/70'
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  )
}
