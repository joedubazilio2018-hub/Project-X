'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase-browser'

export default function NotasPage() {
  const [notes, setNotes] = useState([])
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')

  async function fetchNotes() {
    const { data } = await supabase.from('notes').select('*').order('created_at', { ascending: false })
    setNotes(data || [])
  }

  async function addNote() {
    if (!title) return
    await supabase.from('notes').insert({ title, content })
    setTitle('')
    setContent('')
    fetchNotes()
  }

  async function deleteNote(id: string) {
    await supabase.from('notes').delete().eq('id', id)
    fetchNotes()
  }

  useEffect(() => {
    fetchNotes()
  }, [])

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">🧠 Post-its</h1>

      <div className="mb-4">
        <input
          className="border p-2 mr-2"
          placeholder="Título"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <input
          className="border p-2 mr-2"
          placeholder="Conteúdo"
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        <button onClick={addNote} className="bg-blue-500 text-white px-4 py-2">
          Criar
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {notes.map((note: any) => (
          <div key={note.id} className="bg-yellow-200 p-3 rounded shadow">
            <h2 className="font-bold">{note.title}</h2>
            <p>{note.content}</p>
            <button
              onClick={() => deleteNote(note.id)}
              className="text-red-500 mt-2"
            >
              Deletar
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
