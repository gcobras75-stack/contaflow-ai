interface EmptyStateProps {
  icon:        string
  title:       string
  description: string
  action?:     { label: string; href: string }
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <span className="text-4xl mb-4">{icon}</span>
      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
      <p className="text-gray-400 text-sm max-w-sm mb-6">{description}</p>
      {action && (
        <a
          href={action.href}
          className="px-4 py-2 bg-[#00FF88] text-black rounded-lg text-sm font-medium hover:bg-[#00FF88]/90 transition-colors"
        >
          {action.label}
        </a>
      )}
    </div>
  )
}
