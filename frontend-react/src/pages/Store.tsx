import React from "react";
import { Header } from "@/components/layout/Header";
import logo from "../assets/images/QuizicleLogo.png";
import { Wrench, ShoppingBag } from "lucide-react"; // Import a relevant icon

const Store = () => {
  return (
    // 1. Set up min-height screen, background gradient, and use flex-col to stack header and content
    <div className="min-h-screen bg-gradient-to-br from-background to-quiz-background flex flex-col">
      
      {/* Header component remains at the top */}
      <Header logoAsTitle imageSrc={logo} showNotifications />

      {/* 2. Main content container: flex-1 ensures it fills the remaining space, and flex properties center the content */}
      <div className="flex flex-col items-center justify-center flex-1 p-4 md:p-8">
        
        {/* 3. Content area with max-width and internal spacing */}
        <div className="max-w-2xl w-full text-center space-y-6 pt-10 pb-20">
          
          {/* 4. Icon for visual interest (Wrench for construction, ShoppingBag for a store) */}
          <ShoppingBag className="h-16 w-16 md:h-20 md:w-20 text-primary mx-auto opacity-75" />
          
          {/* 5. Enhanced Title with gradient text and large size */}
          <h1 className="text-6xl md:text-8xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-400 leading-none">
            Store
          </h1>
          
          {/* 6. Subtitle with strong visual hierarchy */}
          <h2 className="text-3xl font-bold text-foreground">
            Coming Soon
          </h2>

          {/* 7. Description for context */}
          <p className="text-lg md:text-xl text-muted-foreground max-w-lg mx-auto pt-2">
            The Quizicle Store is under construction.
          </p>
          
        </div>
      </div>
    </div>
  );
};

export default Store;
// import React, { useState, useRef } from 'react';
// import { Header } from "@/components/layout/Header";
// import { Button } from "@/components/ui/button";
// import { Card } from "@/components/ui/card";
// import GameStatsHeader from "@/components/GameStatsHeader";
// import logo from "../assets/images/QuizicleLogo.png";
// import {
//   Star,
//   Coins,
//   Heart,
//   Gift,
//   Swords,
//   Play,
//   Share,
//   Clock,
//   CheckCircle,
//   Zap,
//   Trophy,
//   Shield
// } from "lucide-react";

// const Store = () => {
//   const [activeSection, setActiveSection] = useState('popular');
  
//   // Refs for scrolling to sections
//   const popularRef = useRef(null);
//   const coinsRef = useRef(null);
//   const livesRef = useRef(null);
//   const hintsRef = useRef(null);
//   const battlesRef = useRef(null);

//   // Store items data
//   const popularItems = [
//     { id: 1, name: 'No ads', price: 'R 49,99', icon: Shield, desc: 'Forever', action: 'buy'},
//     { id: 2, name: 'Infinite lives', price: 'R 49,99', icon: Heart, desc: '24 hours', action: 'buy'},
//     { id: 3, name: 'Vault of coins', price: 'R 239,99', icon: Trophy, desc: '20000', action: 'buy' },
//   ];

//   const coinsItems = [
//     { id: 8, name: 'Invite Friends', price: '+500 coins for each new player!', icon: Share, desc: '', action: 'invite' },
//     { id: 9, name: 'Fair few coins', price: '+100 coins per view', icon: Play, desc: '', action: 'watch' },
//     { id: 10, name: 'Handful of coins', price: 'R 15,99', icon: Coins, desc: '500', action: 'buy' },
//     { id: 11, name: 'Heap of coins', price: 'R 31,99', icon: Coins, desc: '1500', action: 'buy' },
//     { id: 12, name: 'Sack of coins', price: 'R 79,99', icon: Coins, desc: '4000', action: 'buy' },
//     { id: 13, name: 'Stash of coins', price: 'R 129,99', icon: Coins, desc: '8000', action: 'buy' },
//     { id: 14, name: 'Vault of coins', price: 'R 239,99', icon: Trophy, desc: '20000', action: 'buy' },
//   ];

//   const livesItems = [
//     { id: 4, name: 'Extra Life', price: '100', icon: Heart, desc: '+1', action: 'buy-coins' },
//     { id: 5, name: 'Life Bundle', price: '400', icon: Heart, desc: '+5', action: 'buy-coins' },
//     { id: 6, name: 'Infinite lives', price: 'R 49,99', icon: Heart, desc: '24 hours', action: 'buy' },
//     { id: 7, name: 'Weekly Lives', price: 'R 89,99', icon: Heart, desc: '7 days unlimited', action: 'buy' },
//   ];

//   const hintsItems = [
//     { id: 15, name: 'Fifty Fifty', price: 'R 27,99', icon: Zap, desc: 'x30', action: 'buy' },
//     { id: 16, name: 'Right Answer', price: 'R 49,99', icon: CheckCircle, desc: 'x30', action: 'buy' },
//     { id: 17, name: 'Unlimited answer time', price: '1000', icon: Clock, desc: '1 day', action: 'buy-coins' },
//     { id: 18, name: 'Unlimited answer time', price: 'R 49,99', icon: Clock, desc: '7 days', action: 'buy' },
//     { id: 19, name: 'Score Booster x2', price: '2000', icon: Star, desc: '1 day', action: 'buy-coins' },
//     { id: 20, name: 'Score Booster x2', price: 'R 31,99', icon: Star, desc: '1 day', action: 'buy' },
//     { id: 21, name: 'Score Booster x2', price: 'R 89,99', icon: Star, desc: '7 days', action: 'buy' },
//     { id: 22, name: 'Score Booster x3', price: 'R 66,99', icon: Star, desc: '1 day', action: 'buy' },
//   ];


//   // Navigation items
//   const sections = [
//     { id: 'popular', name: 'Popular', icon: Star, color: 'from-pink-400 to-pink-500', ref: popularRef },
//     { id: 'coins', name: 'Coins', icon: Coins, color: 'from-blue-400 to-blue-500', ref: coinsRef },
//     { id: 'lives', name: 'Lives', icon: Heart, color: 'from-purple-400 to-purple-500', ref: livesRef },
//     { id: 'hints', name: 'Hints & Boosters', icon: Gift, color: 'from-green-400 to-green-500', ref: hintsRef },
//   ];

//   const scrollToSection = (sectionId) => {
//     const section = sections.find(s => s.id === sectionId);
//     if (section && section.ref.current) {
//       section.ref.current.scrollIntoView({ 
//         behavior: 'smooth',
//         block: 'start'
//       });
//       setActiveSection(sectionId);
//     }
//   };

//   const getButtonStyle = (action) => {
//     switch (action) {
//       case 'watch':
//         return 'bg-blue-500 hover:bg-blue-600';
//       case 'buy-coins':
//       case 'invite':
//         return 'bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600';
//       default:
//         return 'bg-gradient-to-r from-green-400 to-green-600 hover:from-green-500 hover:to-green-700';
//     }
//   };

//   const renderItem = (item) => {
//     const IconComponent = item.icon;
    
//     return (
//       <Card key={item.id} className="flex items-center p-4 space-x-4 bg-card hover:bg-accent/50 transition-colors">
//         <div className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center bg-primary/20">
//           <IconComponent className="w-6 h-6 text-primary" />
//         </div>
//         <div className="flex-grow">
//           <h3 className="text-foreground text-lg font-semibold">{item.name}</h3>
//           {item.desc && (
//             <p className="text-muted-foreground text-sm">{item.desc}</p>
//           )}
//         </div>
//         <div className="flex-shrink-0">
//           <Button 
//             className={`font-bold py-2 px-4 rounded-full transition duration-200 ${getButtonStyle(item.action)}`}
//             size="sm"
//           >
//             {item.action === 'watch' ? 'WATCH ADS' : item.price}
//           </Button>
//         </div>
//       </Card>
//     );
//   };

//   const renderSection = (sectionId, title, items, icon, colorClass, ref) => {
//     const IconComponent = icon;
    
//     return (
//       <div ref={ref} className="mb-8">
//         <div className={`bg-gradient-to-r ${colorClass} rounded-2xl p-4 flex justify-between items-center mb-4 shadow-md`}>
//           <h2 className="text-2xl font-bold text-white">{title}</h2>
//           <IconComponent className="w-8 h-8 text-white" />
//         </div>
//         <div className="space-y-3">
//           {items.map(renderItem)}
//         </div>
//       </div>
//     );
//   };

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-background to-quiz-background">
//       <Header logoAsTitle imageSrc={logo} showNotifications />

//       <div className="mx-auto max-w-full space-y-4 px-4 pb-4 lg:px-8 lg:pb-8">
//         {/* Game Stats Header */}
//         <div className="top-0 z-10 bg-gradient-to-br from-background to-quiz-background">
//         </div>

//         {/* Store Title */}
//         <div className="text-center py-4">
//           <h1 className="text-3xl font-bold text-foreground">Store</h1>
//         </div>

//         {/* Navigation Cards */}
//         <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
//           {sections.map((section) => {
//             const IconComponent = section.icon;
//             return (
//               <Card
//                 key={section.id}
//                 className={`p-4 cursor-pointer transition-all duration-200 hover:scale-105 ${
//                   activeSection === section.id 
//                     ? 'ring-2 ring-primary bg-primary/10' 
//                     : 'hover:bg-accent/50'
//                 }`}
//                 onClick={() => scrollToSection(section.id)}
//               >
//                 <div className={`bg-gradient-to-r ${section.color} rounded-xl p-3 flex flex-col items-center text-white`}>
//                   <IconComponent className="w-8 h-8 mb-2" />
//                   <span className="text-sm font-bold text-center leading-tight">
//                     {section.name}
//                   </span>
//                 </div>
//               </Card>
//             );
//           })}
//         </div>

//         {/* Store Sections */}
//         <main className="w-full max-w-4xl mx-auto">
//           {renderSection('popular', 'Popular', popularItems, Star, 'from-pink-400 to-pink-500', popularRef)}
//           {renderSection('coins', 'Coins', coinsItems, Coins, 'from-blue-400 to-blue-500', coinsRef)}
//           {renderSection('lives', 'Lives', livesItems, Heart, 'from-purple-400 to-purple-500', livesRef)}
//           {renderSection('hints', 'Hints & Boosters', hintsItems, Gift, 'from-green-400 to-green-500', hintsRef)}
//         </main>
//       </div>
//     </div>
//   );
// };

// export default Store;