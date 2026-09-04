import React from 'react';
import { motion } from 'motion/react';
import { Sparkles, Layers } from 'lucide-react';

interface BrandTitle3DProps {
  title: string;
  isCollapsed?: boolean;
}

export const BrandTitle3D: React.FC<BrandTitle3DProps> = ({ title, isCollapsed = false }) => {
  return (
    <div className="relative inline-flex items-center gap-2.5 select-none perspective-[1000px] group">
      {/* 3D Slow-Motion Holographic Emblem */}
      <motion.div
        animate={{
          rotateY: [0, 360],
          rotateX: [8, -8, 8],
          y: [0, -3, 0],
        }}
        transition={{
          rotateY: { duration: 12, repeat: Infinity, ease: 'linear' },
          rotateX: { duration: 6, repeat: Infinity, ease: 'easeInOut' },
          y: { duration: 4, repeat: Infinity, ease: 'easeInOut' },
        }}
        className={`relative ${isCollapsed ? 'w-6 h-6' : 'w-8 h-8'} shrink-0 preserve-3d flex items-center justify-center`}
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* Glowing 3D Ambient Backdrop */}
        <div className="absolute inset-0 rounded-lg bg-emerald-500/20 blur-md group-hover:bg-emerald-400/30 transition-all duration-700" />
        
        {/* Layered 3D Floating Prism Box */}
        <div className="relative w-full h-full rounded-lg bg-gradient-to-br from-emerald-400 via-teal-600 to-slate-900 border border-emerald-300/40 shadow-[0_4px_12px_rgba(16,185,129,0.35)] flex items-center justify-center overflow-hidden">
          <Layers className={`${isCollapsed ? 'w-3.5 h-3.5' : 'w-4 h-4'} text-emerald-100 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]`} />
          
          {/* Light Glint Flare */}
          <motion.div
            animate={{
              x: ['-120%', '150%'],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              repeatDelay: 1.5,
              ease: 'easeInOut',
            }}
            className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/40 to-transparent -skew-x-25 pointer-events-none"
          />
        </div>
      </motion.div>

      {/* 3D Animated Title Container */}
      <motion.div
        animate={{
          rotateX: [0, 4, 0, -3, 0],
          rotateY: [0, -4, 0, 3, 0],
          y: [0, -2, 0, 1.5, 0],
        }}
        transition={{
          duration: 7,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        whileHover={{
          scale: 1.03,
          rotateX: 6,
          rotateY: -5,
          transition: { duration: 0.3 },
        }}
        className="relative transform-gpu preserve-3d cursor-default"
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* 3D Depth Layer Underneath (Extrusion Shadow) */}
        <span
          aria-hidden="true"
          className={`absolute left-0 top-0 font-black tracking-tight select-none pointer-events-none ${
            isCollapsed ? 'text-sm sm:text-base' : 'text-xl sm:text-2xl'
          } text-emerald-950/80 translate-y-[2.5px] translate-x-[1px] blur-[1px]`}
          style={{
            textShadow: '0 2px 4px rgba(0,0,0,0.9), 0 4px 10px rgba(5,150,105,0.4)',
          }}
        >
          {title}
        </span>

        {/* Primary 3D Front Text with Chrome Emerald Reflection */}
        <h1
          className={`relative font-black tracking-tight ${
            isCollapsed ? 'text-sm sm:text-base' : 'text-xl sm:text-2xl'
          } bg-gradient-to-b from-emerald-100 via-emerald-400 to-teal-500 bg-clip-text text-transparent`}
          style={{
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.7)) drop-shadow(0 0 16px rgba(52,211,153,0.35))',
          }}
        >
          {title}
        </h1>

        {/* Slow-Motion Light Shimmer Overlay Passing Across 3D Text */}
        <motion.div
          animate={{
            x: ['-100%', '200%'],
          }}
          transition={{
            duration: 4.5,
            repeat: Infinity,
            repeatDelay: 2,
            ease: 'easeInOut',
          }}
          className="absolute inset-0 w-1/3 h-full bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-20 pointer-events-none mix-blend-overlay"
        />
      </motion.div>
    </div>
  );
};
