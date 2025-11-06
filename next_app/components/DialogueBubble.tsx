"use client"

import React from 'react'

type Props = {
  speaker: 'abu' | 'lilly'
  text: string
}

export default function DialogueBubble({ speaker, text }: Props) {
  if (!text || typeof text !== 'string') return null
  const isAbu = speaker === 'abu'
  return (
    <div className={`flex items-start gap-2 ${isAbu ? 'justify-start' : 'justify-end'}`}>
      {isAbu && (
        <div className="w-8 h-8 flex-shrink-0 rounded-full bg-yellow-500/30 flex items-center justify-center text-yellow-200 text-xs font-bold">A</div>
      )}
      <div className={`${isAbu ? 'bg-blue-500/20 border-blue-400/30' : 'bg-pink-500/20 border-pink-400/30'} border rounded-lg px-3 py-2 max-w-[36rem] text-sm text-white/90 break-words`}> 
        {text}
      </div>
      {!isAbu && (
        <div className="w-8 h-8 flex-shrink-0 rounded-full bg-purple-500/30 flex items-center justify-center text-purple-200 text-xs font-bold">L</div>
      )}
    </div>
  )
}
