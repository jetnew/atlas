import { SignUpForm } from '@/components/sign-up-form'
import { BackgroundGrid } from '@/components/ui/background-grid'

export default function Page() {
  return (
    <div className="relative flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <BackgroundGrid />
      <div className="relative z-10 w-full max-w-sm">
        <SignUpForm />
      </div>
    </div>
  )
}
