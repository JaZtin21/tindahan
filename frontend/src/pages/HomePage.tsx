import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { OnboardingCarousel } from '../components/onboarding/OnboardingCarousel'

export function HomePage() {
  const navigate = useNavigate()

  useEffect(() => {
    // Check if user has completed onboarding
    const onboardingCompleted = localStorage.getItem('onboardingCompleted')
    if (onboardingCompleted === 'true') {
      navigate('/map', { replace: true })
    }
  }, [navigate])

  return <OnboardingCarousel />
}

