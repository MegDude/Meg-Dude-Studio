/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';

const Header: React.FC = () => {
 return (
 <header className="w-full relative">
 <div className="ic-page-intro pt-36 md:pt-40 pb-5 md:pb-8 text-center px-4">
 <div className="flex items-center justify-center">
 <h1 className="dp-editorial-headline font-medium text-[30px] sm:text-5xl md:text-6xl text-navy-900 mb-3 md:mb-[18px] leading-[1.04] dp-editorial-headline">
 Design Your Space <span className="text-[#C8A96A]">In Seconds</span>
 </h1>
 </div>
 <p className="hero-paragraph text-navy-900 mx-auto mb-0 md:mb-[24px]" style={{ maxWidth: 620, textAlign: 'center' }}>
 An intelligent interior design assistant. Upload a room, add furniture, and let AI composite them into a photorealistic preview.
 </p>
 </div>
 </header>
 );
};

export default Header;
