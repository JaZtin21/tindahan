import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

interface Slide {
  image: string
  title: string
  description: string
}

const slides: Slide[] = [
  {
    image: '/slide3.png',
    title: 'Satisfy your Cravings',
    description: "Craving for a snack or meal right now but don't know where to find it?"
  },
  {
    image: '/slide1.png',
    title: 'Discover Foods',
    description: 'Save your time and transport money by discovering hidden food gems available just a few steps away from your home.'
  },
  {
    image: '/slide2.png',
    title: 'Share your Moments',
    description: 'Take a photo and share your happy eating moments directly with a community of local foodies.'
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
              src="/slide3.png"
              alt=""
              className="w-full h-full md:object-cover fill scale-x-[2.54] scale-y-100 md:scale-100 origin-[179px] md:origin-center"
            />
            <div className="absolute inset-0 bg-black/40" />
          </div>
        )}

        {/* Slide 2 */}
     {currentSlide === 1 && (
          <div key={`slide2-${currentSlide}`} className="absolute inset-0 animate-fade-in">
            <img
              src="/slide1.png"
              alt="Request Products"
              className="w-full h-full md:object-cover fill scale-x-[2.54] scale-y-100 md:scale-100 origin-[260px] md:origin-center"
            />
            <div className="absolute inset-0 bg-black/40" />
          </div>
        )}

        {/* Slide 3 */}
           {currentSlide === 2 && (
          <div key={`slide3-${currentSlide}`} className="absolute inset-0 animate-fade-in">
            <img
              src="/slide2.png"
              alt="Start Exploring"
              className="w-full h-full md:object-cover fill scale-x-[2.54] scale-y-100 md:scale-100"
            />
            <div className="absolute inset-0 bg-black/40" />
          </div>
        )}

        {/* Text Content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center text-white">
          <h1 className="text-4xl md:text-6xl font-bold mb-4 drop-shadow-lg">
            {slides[currentSlide].title}
          </h1>
          <p className="text-xl md:text-2xl max-w-2xl drop-shadow-md mb-8">
            {slides[currentSlide].description}
          </p>

          {/* Next Button - Only on slides 1 and 2 */}
          {!isLastSlide && (
            <button
              onClick={goToNextSlide}
              className="px-6 py-2 bg-primary hover:bg-primary text-white text-md font-semibold rounded-full shadow-xl transition-all transform hover:scale-105"
            >
              Next
            </button>
          )}

          {/* Show Map Button - Only on last slide */}
          {isLastSlide && (
            <button
              onClick={handleShowMap}
              className="px-6 py-2 bg-primary hover:bg-primary text-white text-lg font-semibold rounded-full shadow-xl transition-all transform hover:scale-105"
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
