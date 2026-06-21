import React, { useState, useEffect } from 'react';
import { Image as ImageIcon } from 'lucide-react';
import { getOptimizedImageUrl } from '../src/data/extractedImageManifest';

interface ImageWithFallbackProps extends React.ImgHTMLAttributes<HTMLImageElement> {
    src: string;
    productName: string;
    productId?: string;
}

export const ImageWithFallback: React.FC<ImageWithFallbackProps> = ({ src, productName, productId = '', className, ...props }) => {
    // If not passed use a rough id
    const id = productId || productName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const optimizedUrl = getOptimizedImageUrl(id, src);

    const [imgSrc, setImgSrc] = useState(optimizedUrl);

    useEffect(() => {
        setImgSrc(optimizedUrl);
    }, [optimizedUrl]);

    const handleError = () => {
        if (imgSrc !== '/images/interior-inventory/placeholder.jpg') {
            if (imgSrc === optimizedUrl && !optimizedUrl.includes('placeholder')) {
                 setImgSrc(`/images/interior-inventory/manual-uploads/${id}.jpg`);
            } else if (imgSrc.includes('manual-uploads')) {
                 setImgSrc('/images/interior-inventory/placeholder.jpg');
            }
        }
    };

    if (imgSrc === '/images/interior-inventory/placeholder.jpg') {
        return (
            <div className={`flex flex-col items-center justify-center bg-zinc-100 text-zinc-400 p-2 ${className || 'w-full h-full'}`}>
                <ImageIcon className="w-5 h-5 mb-1 opacity-40 shrink-0" />
                <span className="text-[9px] font-medium leading-tight truncate w-full text-center">{productName}</span>
            </div>
        );
    }

    return (
        <img 
            src={imgSrc} 
            onError={handleError}
            className={className}
            {...props}
        />
    );
};
