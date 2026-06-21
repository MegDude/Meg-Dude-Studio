/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';
import { Product } from '../types';
import { ImageWithFallback } from './ImageWithFallback';
import { RotateCw, Maximize2, Trash2, Wand2 } from 'lucide-react';

interface ObjectCardProps {
 product: Product;
 isSelected: boolean;
 onClick?: () => void;
 onRotate?: (e: React.MouseEvent) => void;
 onScale?: (e: React.MouseEvent) => void;
 onRemove?: (e: React.MouseEvent) => void;
 onEditBackground?: (e: React.MouseEvent) => void;
}

const ObjectCard: React.FC<ObjectCardProps> = ({ 
  product, 
  isSelected, 
  onClick,
  onRotate,
  onScale,
  onRemove,
  onEditBackground
}) => {
 const cardClasses = `
 dp-panel overflow-hidden transition-all duration-300 pointer-events-auto ic-placed-object
 ${onClick ? 'cursor-pointer hover:-translate-y-[1px]' : ''}
 ${isSelected ? 'is-selected ring-2 ring-[#C8A96A] shadow-md shadow-gold-900/5' : 'hover:ring-1 hover:ring-[#C8A96A]/50'}
 `;

 return (
 <div className={cardClasses} onClick={onClick}>
 <div className="relative aspect-square w-full flex items-center justify-center group">
 <ImageWithFallback
 src={product.imageUrl || product.thumbnailUrl || ''} 
 alt={product.name}
 productName={product.name}
 productId={product.id}
 className="w-full h-full object-contain" 
 />
 {(onRotate || onScale || onRemove || onEditBackground) && isSelected && (
   <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-white/95 backdrop-blur shadow-sm border border-navy-100 p-1 rounded-full z-10 transition-all duration-300 animate-fade-in pointer-events-auto">
     {onRotate && (
       <button 
         onClick={(e) => { e.stopPropagation(); onRotate(e); }}
         className="w-11 h-11 flex items-center justify-center rounded-full text-navy-500 hover:text-navy-900 hover:bg-navy-50 transition-colors"
         aria-label="rotate"
       >
         <RotateCw className="w-5 h-5" />
       </button>
     )}
     {onScale && (
       <button 
         onClick={(e) => { e.stopPropagation(); onScale(e); }}
         className="w-11 h-11 flex items-center justify-center rounded-full text-navy-500 hover:text-navy-900 hover:bg-navy-50 transition-colors"
         aria-label="scale"
       >
         <Maximize2 className="w-5 h-5" />
       </button>
     )}
     {onEditBackground && (
        <button 
          onClick={(e) => { e.stopPropagation(); onEditBackground(e); }}
          className="w-11 h-11 flex items-center justify-center rounded-full text-navy-500 hover:text-gold-600 hover:bg-gold-50 transition-colors"
          aria-label="edit background"
          title="Match Product Background"
        >
          <Wand2 className="w-5 h-5" />
        </button>
      )}
      {onRemove && (
       <button 
         onClick={(e) => { e.stopPropagation(); onRemove(e); }}
         className="w-11 h-11 flex items-center justify-center rounded-full text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors"
         aria-label="remove"
       >
         <Trash2 className="w-5 h-5" />
       </button>
     )}
   </div>
 )}
 </div>
 <div className="p-3 text-center bg-white border-t border-navy-50/50">
 <h4 className={`text-sm font-semibold truncate transition-colors ${isSelected ? 'text-[#C8A96A]' : 'text-navy-900'}`}>{product.name}</h4>
 <p className="dp-muted font-semibold text-[11px] truncate mt-0.5">{product.brand || product.type}</p>
 </div>
 </div>
 );
};

export default ObjectCard;