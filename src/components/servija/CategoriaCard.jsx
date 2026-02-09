import React from 'react';
import { 
  Home, Sparkles, Baby, Heart, Dog, Footprints,
  Zap, Droplets, Hammer, PaintBucket, Package, Wind,
  Flower, Key, Dumbbell, GraduationCap, Hand, Scissors, 
  User
} from 'lucide-react';

const iconMap = {
  'Home': Home,
  'Sparkles': Sparkles,
  'Baby': Baby,
  'Heart': Heart,
  'Dog': Dog,
  'Footprints': Footprints,
  'Zap': Zap,
  'Droplets': Droplets,
  'Hammer': Hammer,
  'PaintBucket': PaintBucket,
  'Package': Package,
  'Wind': Wind,
  'Flower': Flower,
  'Key': Key,
  'Dumbbell': Dumbbell,
  'GraduationCap': GraduationCap,
  'Hand': Hand,
  'Scissors': Scissors,
  'User': User,
};

export default function CategoriaCard({ categoria, onClick, selected = false }) {
  const IconComponent = iconMap[categoria.icone] || User;

  return (
    <button
      onClick={() => onClick(categoria)}
      className={`
        flex flex-col items-center justify-center p-4 rounded-2xl transition-all duration-200
        ${selected 
          ? 'bg-blue-600 text-white shadow-lg scale-105' 
          : 'bg-white text-gray-700 hover:bg-blue-50 hover:text-blue-600 shadow-sm border border-gray-100'
        }
      `}
    >
      <div className={`
        w-12 h-12 rounded-xl flex items-center justify-center mb-2
        ${selected ? 'bg-blue-500' : 'bg-blue-50'}
      `}>
        <IconComponent className={`w-6 h-6 ${selected ? 'text-white' : 'text-blue-600'}`} />
      </div>
      <span className="text-sm font-medium text-center line-clamp-2">
        {categoria.nome}
      </span>
    </button>
  );
}