/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';

const Header: React.FC = () => {
 return (
 <header className="w-full relative">
 <div className="ic-page-intro pt-6 md:pt-8 pb-4 md:pb-6 text-center px-4">
 <h1 className="ic-hero-subhead dp-editorial-headline font-medium text-navy-900 mb-3 leading-[1.08]">
 Design Your Space <span className="text-[#C8A96A]">In Seconds</span>
 </h1>
 <p className="hero-paragraph text-navy-900 mx-auto mb-0 md:mb-[24px]" style={{ maxWidth: 620, textAlign: 'center' }}>
 An intelligent interior design assistant. Upload a room, add furniture, and let AI composite them into a photorealistic preview.
 </p>
 </div>
 </header>
 );
};

export default Header;
