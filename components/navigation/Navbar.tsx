'use client';

import * as React from 'react';
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuList,
} from '@/components/ui/navigation-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { WifiOff } from 'lucide-react';

/**
 * Custom Vehicle Counter Logo
 * Requirements: 5.3, 5.4
 * 
 * SVG icon representing vehicle monitoring with a road/highway theme
 */
const HighwayMonitorLogo = (props: React.SVGAttributes<SVGElement>) => {
  return (
    <svg
      width="1em"
      height="1em"
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      {/* Road/Highway base */}
      <rect x="4" y="12" width="24" height="8" rx="1" fill="currentColor" opacity="0.3" />
      
      {/* Vehicle 1 - Car */}
      <path
        d="M8 14 L10 14 L11 12 L13 12 L14 14 L16 14 L16 18 L8 18 Z"
        fill="currentColor"
      />
      <circle cx="10" cy="18" r="1.5" fill="currentColor" />
      <circle cx="14" cy="18" r="1.5" fill="currentColor" />
      
      {/* Vehicle 2 - Truck */}
      <path
        d="M18 13 L20 13 L21 11 L24 11 L25 13 L27 13 L27 19 L18 19 Z"
        fill="currentColor"
      />
      <rect x="23" y="13" width="4" height="4" fill="currentColor" opacity="0.6" />
      <circle cx="20" cy="19" r="1.5" fill="currentColor" />
      <circle cx="25" cy="19" r="1.5" fill="currentColor" />
    </svg>
  );
};

/**
 * Hamburger Menu Icon with animation
 * Requirements: 5.5
 */
const HamburgerIcon = ({ className, ...props }: React.SVGAttributes<SVGElement>) => (
  <svg
    className={cn('pointer-events-none', className)}
    width={16}
    height={16}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M4 12L20 12"
      className="origin-center -translate-y-[7px] transition-all duration-300 ease-[cubic-bezier(.5,.85,.25,1.1)] group-aria-expanded:translate-x-0 group-aria-expanded:translate-y-0 group-aria-expanded:rotate-[315deg]"
    />
    <path
      d="M4 12H20"
      className="origin-center transition-all duration-300 ease-[cubic-bezier(.5,.85,.25,1.8)] group-aria-expanded:rotate-45"
    />
    <path
      d="M4 12H20"
      className="origin-center translate-y-[7px] transition-all duration-300 ease-[cubic-bezier(.5,.85,.25,1.1)] group-aria-expanded:translate-y-0 group-aria-expanded:rotate-[135deg]"
    />
  </svg>
);

/**
 * Navigation Link Interface
 */
export interface NavLink {
  href: string;
  label: string;
}

/**
 * Navbar Component Props
 */
export interface NavbarProps extends React.HTMLAttributes<HTMLElement> {
  navigationLinks?: NavLink[];
}

/**
 * Vehicle Counter Navigation Component
 * Requirements: 5.3, 5.4, 5.5
 * 
 * Features:
 * - Custom Vehicle Counter branding with vehicle logo
 * - Navigation items: "Live Detection" and "Data"
 * - Sticky positioning at top of viewport
 * - Responsive hamburger menu for mobile devices
 * - Active state indication based on current route
 */
export const Navbar = React.forwardRef<HTMLElement, NavbarProps>(
  ({ className, navigationLinks, ...props }, ref) => {
    const pathname = usePathname();
    const [isMobile, setIsMobile] = useState(false);
    const containerRef = useRef<HTMLElement>(null);
    const isOnline = useOnlineStatus();

    // Default navigation links
    const defaultLinks: NavLink[] = [
      { href: '/', label: 'Live Detection' },
      { href: '/data', label: 'Data' },
    ];

    const links = navigationLinks || defaultLinks;

    // Responsive breakpoint detection
    useEffect(() => {
      const checkWidth = () => {
        if (containerRef.current) {
          const width = containerRef.current.offsetWidth;
          setIsMobile(width < 768); // 768px is md breakpoint
        }
      };

      checkWidth();

      const resizeObserver = new ResizeObserver(checkWidth);
      if (containerRef.current) {
        resizeObserver.observe(containerRef.current);
      }

      return () => {
        resizeObserver.disconnect();
      };
    }, []);

    // Combine refs
    const combinedRef = React.useCallback(
      (node: HTMLElement | null) => {
        containerRef.current = node;
        if (typeof ref === 'function') {
          ref(node);
        } else if (ref) {
          ref.current = node;
        }
      },
      [ref]
    );

    return (
      <header
        ref={combinedRef}
        className={cn(
          'sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 md:px-6',
          className
        )}
        {...props}
      >
        <div className="container mx-auto flex h-16 max-w-screen-2xl items-center justify-between gap-4">
          {/* Left side - Logo and Navigation */}
          <div className="flex items-center gap-2">
            {/* Mobile menu trigger */}
            {isMobile && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    className="group h-9 w-9 hover:bg-accent hover:text-accent-foreground"
                    variant="ghost"
                    size="icon"
                  >
                    <HamburgerIcon />
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-48 p-2">
                  <NavigationMenu className="max-w-none">
                    <NavigationMenuList className="flex-col items-start gap-1">
                      {links.map((link, index) => {
                        const isActive = pathname === link.href;
                        return (
                          <NavigationMenuItem key={index} className="w-full">
                            <Link
                              href={link.href}
                              className={cn(
                                'flex w-full items-center rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground no-underline',
                                isActive
                                  ? 'bg-accent text-accent-foreground'
                                  : 'text-foreground/80'
                              )}
                            >
                              {link.label}
                            </Link>
                          </NavigationMenuItem>
                        );
                      })}
                    </NavigationMenuList>
                  </NavigationMenu>
                </PopoverContent>
              </Popover>
            )}

            {/* Logo and Brand */}
            <div className="flex items-center gap-6">
              <Link
                href="/"
                className="flex items-center space-x-2 text-primary hover:text-primary/90 transition-colors no-underline"
              >
                <div className="text-2xl">
                  <HighwayMonitorLogo />
                </div>
                <span className="hidden font-bold text-xl sm:inline-block">
                  Vehicle Counter
                </span>
              </Link>

              {/* Desktop Navigation Menu */}
              {!isMobile && (
                <NavigationMenu className="flex">
                  <NavigationMenuList className="gap-1">
                    {links.map((link, index) => {
                      const isActive = pathname === link.href;
                      return (
                        <NavigationMenuItem key={index}>
                          <Link
                            href={link.href}
                            className={cn(
                              'group inline-flex h-9 w-max items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50 no-underline',
                              isActive
                                ? 'bg-accent text-accent-foreground'
                                : 'text-foreground/80 hover:text-foreground'
                            )}
                          >
                            {link.label}
                          </Link>
                        </NavigationMenuItem>
                      );
                    })}
                  </NavigationMenuList>
                </NavigationMenu>
              )}
            </div>
          </div>

          {/* Right side - Offline Indicator */}
          {!isOnline && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-destructive/10 text-destructive rounded-md border border-destructive/20">
              <WifiOff className="h-4 w-4" />
              <span className="text-sm font-medium hidden sm:inline">Offline</span>
            </div>
          )}
        </div>
      </header>
    );
  }
);

Navbar.displayName = 'Navbar';

export { HighwayMonitorLogo, HamburgerIcon };
