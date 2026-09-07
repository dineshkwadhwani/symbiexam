import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data: question } = await supabase.from('questions').select('assessment_id').eq('id', id).single()
  if (!question) return NextResponse.json({ error: 'Question not found' }, { status: 404 })
  const { data: assessment } = await supabase.from('assessments').select('id').eq('id', question.assessment_id).eq('teacher_id', user.id).single()
  if (!assessment) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const file = (await req.formData()).get('image')
  if (!(file instanceof File)) return NextResponse.json({ error: 'Image is required' }, { status: 400 })
  if (!file.type.startsWith('image/')) return NextResponse.json({ error: 'Only image files are supported' }, { status: 400 })

  const path = `${question.assessment_id}/${id}-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '-')}`
  const admin = createAdminClient()
  const { error: uploadError } = await admin.storage.from('question-images').upload(path, file, { contentType: file.type, upsert: true })
  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 400 })
  const { data: publicUrl } = admin.storage.from('question-images').getPublicUrl(path)
  const { data, error } = await admin.from('questions').update({ image_url: publicUrl.publicUrl }).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ question: data })
}