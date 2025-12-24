import { Search, Home, User, Calendar, MapPin } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';

interface SearchResult {
  id: string;
  type: 'property' | 'user' | 'booking' | 'visit';
  title: string;
  subtitle: string;
}

interface GlobalSearchProps {
  onSelectResult?: (result: SearchResult) => void;
}

export function GlobalSearch({ onSelectResult }: GlobalSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Mock data - TODO: remplacer par vraie recherche API
  const mockSearch = (q: string): SearchResult[] => {
    if (!q || q.length < 2) return [];

    const allResults: SearchResult[] = [
      { id: 'prop-1', type: 'property', title: 'Studio meublé Bonapriso', subtitle: 'Douala • 85,000 FCFA/mois' },
      { id: 'prop-2', type: 'property', title: 'Appartement 2 pièces Bastos', subtitle: 'Yaoundé • 120,000 FCFA/mois' },
      { id: 'user-1', type: 'user', title: 'Marie Ngo', subtitle: 'marie.ngo@example.cm • Locataire' },
      { id: 'user-2', type: 'user', title: 'Jean Kamga', subtitle: 'jean.kamga@example.cm • Propriétaire' },
      { id: 'book-1', type: 'booking', title: 'RES-2024-001', subtitle: 'Marie Ngo • Studio Bonapriso • 3 mois' },
      { id: 'visit-1', type: 'visit', title: 'VIS-2024-045', subtitle: 'Paul Tchoua • Appt Bastos • 15/11/2025 14h' },
    ];

    return allResults.filter(r => 
      r.title.toLowerCase().includes(q.toLowerCase()) || 
      r.subtitle.toLowerCase().includes(q.toLowerCase())
    );
  };

  useEffect(() => {
    if (query.length >= 2) {
      const searchResults = mockSearch(query);
      setResults(searchResults);
      setIsOpen(searchResults.length > 0);
      setSelectedIndex(0);
    } else {
      setResults([]);
      setIsOpen(false);
    }
  }, [query]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % results.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + results.length) % results.length);
        break;
      case 'Enter':
        e.preventDefault();
        if (results[selectedIndex]) {
          handleSelectResult(results[selectedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        inputRef.current?.blur();
        break;
    }
  };

  const handleSelectResult = (result: SearchResult) => {
    setQuery('');
    setIsOpen(false);
    onSelectResult?.(result);
    console.log('Selected:', result); // TODO: navigation vers la page détail
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'property': return <Home className="w-4 h-4" />;
      case 'user': return <User className="w-4 h-4" />;
      case 'booking': return <Calendar className="w-4 h-4" />;
      case 'visit': return <MapPin className="w-4 h-4" />;
      default: return null;
    }
  };

  const getBadgeLabel = (type: string) => {
    switch (type) {
      case 'property': return 'Annonce';
      case 'user': return 'Utilisateur';
      case 'booking': return 'Réservation';
      case 'visit': return 'Visite';
      default: return type;
    }
  };

  const getBadgeColor = (type: string) => {
    switch (type) {
      case 'property': return 'bg-green-100 text-green-700';
      case 'user': return 'bg-blue-100 text-blue-700';
      case 'booking': return 'bg-purple-100 text-purple-700';
      case 'visit': return 'bg-orange-100 text-orange-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="relative flex-1" ref={dropdownRef}>
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 z-10" />
      <Input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Rechercher annonces, utilisateurs, réservations..."
        className="pl-10 bg-gray-50 border-gray-200 rounded-xl"
      />

      {/* Dropdown Results */}
      {isOpen && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden z-50 max-h-96 overflow-y-auto">
          {results.map((result, index) => (
            <div
              key={result.id}
              onClick={() => handleSelectResult(result)}
              className={`flex items-center gap-3 p-3 cursor-pointer transition-colors ${
                index === selectedIndex ? 'bg-gray-50' : 'hover:bg-gray-50'
              }`}
            >
              <div className={`p-2 rounded-lg ${getBadgeColor(result.type)} bg-opacity-20`}>
                {getIcon(result.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm text-gray-900 truncate">{result.title}</p>
                  <Badge className={`text-xs ${getBadgeColor(result.type)}`}>
                    {getBadgeLabel(result.type)}
                  </Badge>
                </div>
                <p className="text-xs text-gray-500 truncate">{result.subtitle}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
