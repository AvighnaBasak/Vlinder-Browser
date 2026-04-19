import { SearchIcon, KeyboardIcon, LoaderIcon } from 'lucide-react'

interface EmptyStateProps {
  type: 'loading' | 'no-results' | 'no-shortcuts'
  searchTerm?: string
}

export function EmptyState({ type, searchTerm }: EmptyStateProps) {
  if (type === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <LoaderIcon className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-2">Loading shortcuts...</h3>
        <p className="text-muted-foreground">Please wait while we load your keyboard shortcuts.</p>
      </div>
    )
  }

  if (type === 'no-results') {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <SearchIcon className="h-8 w-8 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-2">No shortcuts found</h3>
        <p className="text-muted-foreground">No shortcuts match "{searchTerm}". Try adjusting your search terms.</p>
      </div>
    )
  }

  if (type === 'no-shortcuts') {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <KeyboardIcon className="h-8 w-8 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-2">No shortcuts available</h3>
        <p className="text-muted-foreground">There are no keyboard shortcuts configured at the moment.</p>
      </div>
    )
  }

  return null
}
