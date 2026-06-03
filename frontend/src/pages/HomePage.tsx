import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { OnboardingCarousel } from '../components/onboarding/OnboardingCarousel'

export function HomePage() {
  const navigate = useNavigate()
  const onboardingCompleted = localStorage.getItem('onboardingCompleted') 


  if(onboardingCompleted){
    window.location.href = "/map";
  }else{
     return <OnboardingCarousel />
  }

 
}

