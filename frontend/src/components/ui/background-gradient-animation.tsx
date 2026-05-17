"use client";

import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

export const BackgroundGradientAnimation = ({
  gradientBackgroundStart = 'rgb(250, 252, 249)',
  gradientBackgroundEnd = 'rgb(242, 247, 243)',
  firstColor = '120, 166, 140',
  secondColor = '161, 142, 90',
  thirdColor = '94, 129, 116',
  fourthColor = '148, 133, 99',
  fifthColor = '111, 154, 131',
  pointerColor = '140, 160, 150',
  size = '80%',
  blendingValue = 'hard-light',
  children,
  className,
  interactive = true,
  containerClassName,
}: {
  gradientBackgroundStart?: string;
  gradientBackgroundEnd?: string;
  firstColor?: string;
  secondColor?: string;
  thirdColor?: string;
  fourthColor?: string;
  fifthColor?: string;
  pointerColor?: string;
  size?: string;
  blendingValue?: string;
  children?: ReactNode;
  className?: string;
  interactive?: boolean;
  containerClassName?: string;
}) => {
  const interactiveRef = useRef<HTMLDivElement>(null);
  const curXRef = useRef(0);
  const curYRef = useRef(0);
  const tgXRef = useRef(0);
  const tgYRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    document.body.style.setProperty(
      '--gradient-background-start',
      gradientBackgroundStart,
    );
    document.body.style.setProperty(
      '--gradient-background-end',
      gradientBackgroundEnd,
    );
    document.body.style.setProperty('--first-color', firstColor);
    document.body.style.setProperty('--second-color', secondColor);
    document.body.style.setProperty('--third-color', thirdColor);
    document.body.style.setProperty('--fourth-color', fourthColor);
    document.body.style.setProperty('--fifth-color', fifthColor);
    document.body.style.setProperty('--pointer-color', pointerColor);
    document.body.style.setProperty('--size', size);
    document.body.style.setProperty('--blending-value', blendingValue);
  }, []);

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (interactiveRef.current) {
      const rect = interactiveRef.current.getBoundingClientRect();
      tgXRef.current = event.clientX - rect.left;
      tgYRef.current = event.clientY - rect.top;
    }
  };

  useEffect(() => {
    if (!interactive) {
      return;
    }

    const animate = () => {
      if (interactiveRef.current) {
        curXRef.current += (tgXRef.current - curXRef.current) / 18;
        curYRef.current += (tgYRef.current - curYRef.current) / 18;
        interactiveRef.current.style.transform = `translate(${Math.round(
          curXRef.current,
        )}px, ${Math.round(curYRef.current)}px)`;
      }

      rafRef.current = window.requestAnimationFrame(animate);
    };

    rafRef.current = window.requestAnimationFrame(animate);

    return () => {
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
      }
    };
  }, [interactive]);

  const [isSafari, setIsSafari] = useState(false);
  useEffect(() => {
    setIsSafari(/^((?!chrome|android).)*safari/i.test(navigator.userAgent));
  }, []);

  return (
    <div
      onMouseMove={interactive ? handleMouseMove : undefined}
      className={cn(
        'relative min-h-dvh w-full overflow-x-clip bg-[linear-gradient(40deg,var(--gradient-background-start),var(--gradient-background-end))]',
        containerClassName,
      )}
    >
      <svg className="hidden">
        <defs>
          <filter id="blurMe">
            <feGaussianBlur
              in="SourceGraphic"
              stdDeviation="10"
              result="blur"
            />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -8"
              result="goo"
            />
            <feBlend in="SourceGraphic" in2="goo" />
          </filter>
        </defs>
      </svg>
      <div className={cn('relative z-10', className)}>{children}</div>
      <div
        className={cn(
          'gradients-container absolute inset-0 h-full w-full overflow-hidden blur-xl',
          isSafari ? 'blur-3xl' : '[filter:url(#blurMe)_blur(56px)]',
        )}
      >
        <div
          className={cn(
            '[background:radial-gradient(circle_at_center,_rgba(var(--first-color),_0.85)_0,_rgba(var(--first-color),_0.55)_28%,_rgba(var(--first-color),_0)_64%)_no-repeat]',
            '[mix-blend-mode:var(--blending-value)] absolute h-[var(--size)] w-[var(--size)] top-[calc(48%-var(--size)/2)] left-[calc(56%-var(--size)/2)]',
            '[transform-origin:center_center]',
            'will-change-transform',
            'animate-first',
            'opacity-100',
          )}
        />
        <div
          className={cn(
            '[background:radial-gradient(circle_at_center,_rgba(var(--second-color),_0.78)_0,_rgba(var(--second-color),_0.45)_30%,_rgba(var(--second-color),_0)_68%)_no-repeat]',
            '[mix-blend-mode:var(--blending-value)] absolute h-[var(--size)] w-[var(--size)] top-[calc(48%-var(--size)/2)] left-[calc(56%-var(--size)/2)]',
            '[transform-origin:calc(50%-400px)]',
            'will-change-transform',
            'animate-second',
            'opacity-100',
          )}
        />
        <div
          className={cn(
            '[background:radial-gradient(circle_at_center,_rgba(var(--third-color),_0.78)_0,_rgba(var(--third-color),_0.42)_30%,_rgba(var(--third-color),_0)_68%)_no-repeat]',
            '[mix-blend-mode:var(--blending-value)] absolute h-[var(--size)] w-[var(--size)] top-[calc(48%-var(--size)/2)] left-[calc(56%-var(--size)/2)]',
            '[transform-origin:calc(50%+400px)]',
            'will-change-transform',
            'animate-third',
            'opacity-100',
          )}
        />
        <div
          className={cn(
            '[background:radial-gradient(circle_at_center,_rgba(var(--fourth-color),_0.72)_0,_rgba(var(--fourth-color),_0.38)_28%,_rgba(var(--fourth-color),_0)_64%)_no-repeat]',
            '[mix-blend-mode:var(--blending-value)] absolute h-[var(--size)] w-[var(--size)] top-[calc(48%-var(--size)/2)] left-[calc(56%-var(--size)/2)]',
            '[transform-origin:calc(50%-200px)]',
            'will-change-transform',
            'animate-fourth',
            'opacity-70',
          )}
        />
        <div
          className={cn(
            '[background:radial-gradient(circle_at_center,_rgba(var(--fifth-color),_0.78)_0,_rgba(var(--fifth-color),_0.44)_30%,_rgba(var(--fifth-color),_0)_68%)_no-repeat]',
            '[mix-blend-mode:var(--blending-value)] absolute h-[var(--size)] w-[var(--size)] top-[calc(48%-var(--size)/2)] left-[calc(56%-var(--size)/2)]',
            '[transform-origin:calc(50%-800px)_calc(50%+800px)]',
            'will-change-transform',
            'animate-fifth',
            'opacity-100',
          )}
        />

        {interactive && (
          <div
            ref={interactiveRef}
            className={cn(
              '[background:radial-gradient(circle_at_center,_rgba(var(--pointer-color),_0.42)_0,_rgba(var(--pointer-color),_0.2)_22%,_rgba(var(--pointer-color),_0)_60%)_no-repeat]',
              '[mix-blend-mode:var(--blending-value)] absolute h-full w-full -top-1/2 -left-1/2',
              'opacity-80 will-change-transform',
            )}
          />
        )}
      </div>
    </div>
  );
};
