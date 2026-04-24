export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex w-full bg-[#0a0a0a]" style={{ fontFamily: "Manrope, system-ui, sans-serif" }}>
      
      {/* Lado Esquerdo - Imagem 50% */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-black overflow-hidden border-r border-surface-container-highest">
        {/* Imagem configurada para mostrar e conter todas as informações (bg-contain) */}
        <div 
          className="absolute inset-0 z-0 bg-contain bg-center bg-no-repeat"
          id="auth-background-image"
          style={{
            backgroundImage: "url('/award-bg.jpg')",
          }}
        />
        {/* Gradiente por cima para dar uma transição suave perto da borda (opcional) */}
        <div className="absolute inset-0 z-10 bg-gradient-to-r from-transparent to-[#0a0a0a]/50 pointer-events-none" />
        
      </div>

      {/* Lado Direito - Conteúdo (Login/Recuperação) 50% */}
      <div className="w-full lg:w-1/2 relative flex flex-col justify-center items-center p-6 lg:p-12">
        {/* Glow Effect isolado no painel direito */}
        <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent pointer-events-none opacity-50" />
        
        <div className="relative z-10 w-full max-w-md flex flex-col justify-center">
          {children}
        </div>
      </div>

    </div>
  );
}
