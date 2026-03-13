import { Header } from '@/components/layout/Header'
import React from 'react'
import Menu  from './Menu'

const About = () => {
  const privacyPolicyUrl = import.meta.env.VITE_PRIVACY_POLICY_URL || "/privacypolicy.html";

  const openPrivacyPolicy = () => {
    window.open(privacyPolicyUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div className='min-h-screen '>
      <Header title="About Us" showSearch />
    
      <div className='flex flex-col items-center justify-center px-4 py-16'>
        <div className='text-center space-y-6'>
          <div className='mb-8'>
            <img src="/QuizicleLogo.png" alt="Logo" className='h-20 mx-auto' />
          </div>
          
          <div className='bg-background rounded-lg shadow-sm px-8 py-6 border border-gray-200'>
            <p className='text-gray-600 text-sm mb-2'>Contact us at</p>
            <a 
              href="mailto:benjamin.pullicino@gmail.com"
              className='text-lg font-medium text-blue-600 hover:text-blue-700 transition-colors'
            >
             info@quizicle.app
            </a>
          </div>

          <div className='bg-background rounded-lg shadow-sm px-8 py-6 border border-gray-200'>
            <p className='text-gray-600 text-sm mb-3'>Read how we handle your data</p>
            <button
              type="button"
              onClick={openPrivacyPolicy}
              className='text-lg font-medium text-blue-600 hover:text-blue-700 transition-colors'
            >
              Privacy Policy
            </button>
          </div>
        </div>
      </div>
      <Menu/>
    </div>
  )
}

export default About
