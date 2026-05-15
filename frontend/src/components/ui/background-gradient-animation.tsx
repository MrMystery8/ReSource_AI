"use client";

import type { CSSProperties, ReactNode } from 'react';
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
  size = '68%',
  blendingValue = 'soft-light',
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

  const [curX, setCurX] = useState(0);
  const [curY, setCurY] = useState(0);
  const [tgX, setTgX] = useState(0);
  const [tgY, setTgY] = useState(0);

  const cssVariables = {
    '--gradient-background-start': gradientBackgroundStart,
    '--gradient-background-end': gradientBackgroundEnd,
    '--first-color': firstColor,
    '--second-color': secondColor,
    '--third-color': thirdColor,
    '--fourth-color': fourthColor,
    '--fifth-color': fifthColor,
    '--pointer-color': pointerColor,
    '--size': size,
    '--blending-value': blendingValue,
  } as CSSProperties;

  useEffect(() => {
    const style = document.body.style;
    style.setProperty('--gradient-background-start', gradientBackgroundStart);
    style.setProperty('--gradient-background-end', gradientBackgroundEnd);
    style.setProperty('--first-color', firstColor);
    style.setProperty('--second-color', secondColor);
    style.setProperty('--third-color', thirdColor);
    style.setProperty('--fourth-color', fourthColor);
    style.setProperty('--fifth-color', fifthColor);
    style.setProperty('--pointer-color', pointerColor);
    style.setProperty('--size', size);
    style.setProperty('--blending-value', blendingValue);

    return () => {
      style.removeProperty('--gradient-background-start');
      style.removeProperty('--gradient-background-end');
      style.removeProperty('--first-color');
      style.removeProperty('--second-color');
      style.removeProperty('--third-color');
      style.removeProperty('--fourth-color');
      style.removeProperty('--fifth-color');
      style.removeProperty('--pointer-color');
      style.removeProperty('--size');
      style.removeProperty('--blending-value');
    };
  }, [
    gradientBackgroundStart,
    gradientBackgroundEnd,
    firstColor,
    secondColor,
    thirdColor,
    fourthColor,
    fifthColor,
    pointerColor,
    size,
    blendingValue,
  ]);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!interactiveRef.current) {
        return;
      }

      const rect = interactiveRef.current.getBoundingClientRect();
      setTgX(event.clientX - rect.left);
      setTgY(event.clientY - rect.top);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useEffect(() => {
    function move() {
      if (!interactiveRef.current) {
        return;
      }

      const nextX = curX + (tgX - curX) / 20;
      const nextY = curY + (tgY - curY) / 20;
      setCurX(nextX);
      setCurY(nextY);
      interactiveRef.current.style.transform = `translate(${Math.round(
        nextX,
      )}px, ${Math.round(nextY)}px)`;
    }

    move();
  }, [curX, curY, tgX, tgY]);

  const [isSafari, setIsSafari] = useState(false);
  useEffect(() => {
    setIsSafari(/^((?!chrome|android).)*safari/i.test(navigator.userAgent));
  }, []);

  return (
    <div
      className={cn(
        'relative min-h-dvh w-full overflow-x-clip bg-[linear-gradient(40deg,var(--gradient-background-start),var(--gradient-background-end))]',
        containerClassName,
      )}
      style={cssVariables}
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
          'gradients-container fixed inset-0 h-screen w-screen blur-lg pointer-events-none',
          isSafari ? 'blur-2xl' : '[filter:url(#blurMe)_blur(40px)]',
        )}
      >
        <div
          className={cn(
            'absolute [background:radial-gradient(circle_at_center,_var(--first-color)_0,_var(--first-color)_50%)_no-repeat]',
            '[mix-blend-mode:var(--blending-value)] w-[var(--size)] h-[var(--size)] top-[calc(50%-var(--size)/2)] left-[calc(50%-var(--size)/2)]',
            '[transform-origin:center_center]',
            'animate-first',
            'opacity-70',
          )}
        />
        <div
          className={cn(
            'absolute [background:radial-gradient(circle_at_center,_rgba(var(--second-color),_0.6)_0,_rgba(var(--second-color),_0)_50%)_no-repeat]',
            '[mix-blend-mode:var(--blending-value)] w-[var(--size)] h-[var(--size)] top-[calc(50%-var(--size)/2)] left-[calc(50%-var(--size)/2)]',
            '[transform-origin:calc(50%-400px)]',
            'animate-second',
            'opacity-60',
          )}
        />
        <div
          className={cn(
            'absolute [background:radial-gradient(circle_at_center,_rgba(var(--third-color),_0.6)_0,_rgba(var(--third-color),_0)_50%)_no-repeat]',
            '[mix-blend-mode:var(--blending-value)] w-[var(--size)] h-[var(--size)] top-[calc(50%-var(--size)/2)] left-[calc(50%-var(--size)/2)]',
            '[transform-origin:calc(50%+400px)]',
            'animate-third',
            'opacity-60',
          )}
        />
        <div
          className={cn(
            'absolute [background:radial-gradient(circle_at_center,_rgba(var(--fourth-color),_0.55)_0,_rgba(var(--fourth-color),_0)_50%)_no-repeat]',
            '[mix-blend-mode:var(--blending-value)] w-[var(--size)] h-[var(--size)] top-[calc(50%-var(--size)/2)] left-[calc(50%-var(--size)/2)]',
            '[transform-origin:calc(50%-200px)]',
            'animate-fourth',
            'opacity-50',
          )}
        />
        <div
          className={cn(
            'absolute [background:radial-gradient(circle_at_center,_rgba(var(--fifth-color),_0.6)_0,_rgba(var(--fifth-color),_0)_50%)_no-repeat]',
            '[mix-blend-mode:var(--blending-value)] w-[var(--size)] h-[var(--size)] top-[calc(50%-var(--size)/2)] left-[calc(50%-var(--size)/2)]',
            '[transform-origin:calc(50%-800px)_calc(50%+800px)]',
            'animate-fifth',
            'opacity-60',
          )}
        />

        {interactive && (
          <div
            ref={interactiveRef}
            className={cn(
              'absolute [background:radial-gradient(circle_at_center,_rgba(var(--pointer-color),_0.45)_0,_rgba(var(--pointer-color),_0)_50%)_no-repeat]',
              '[mix-blend-mode:var(--blending-value)] w-full h-full -top-1/2 -left-1/2',
              'opacity-30 pointer-events-none',
            )}
          />
        )}
      </div>
    </div>
  );
};
