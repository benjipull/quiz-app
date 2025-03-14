import React from 'react'
import AddCategory from './AddCategory'
import MostPlayedQuizzes from './MostPlayedQuizzes'
import OneMoreTry from './OneMoreTry'
import LatestQuizzes from './LatestQuizzies'
import OtherQuizzes from './OtherQuizzes'

export default function Home() {
  return (
    <div>
     <AddCategory/>
      <MostPlayedQuizzes/>
      <OneMoreTry/>
      <LatestQuizzes/>
      <OtherQuizzes/>
    </div>
  )
}
