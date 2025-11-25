'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Calendar, MapPin, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import Badge from './ui/Badge';

interface Event {
  id: string;
  title: string;
  description: string;
  date: Date;
  imageUrl: string;
  location: string;
  category: string;
  price?: number;
  isFeatured?: boolean;
  isVIP?: boolean;
}

interface FeaturedCarouselProps {
  events: Event[];
  autoPlayInterval?: number;
}

export default function FeaturedCarousel({ 
  events, 
  autoPlayInterval = 5000 
}: FeaturedCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  // Auto-play functionality
  useEffect(() => {
    if (!isAutoPlaying || events.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % events.length);
    }, autoPlayInterval);

    return () => clearInterval(interval);
  }, [isAutoPlaying, events.length, autoPlayInterval]);

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
    setIsAutoPlaying(false);
  };

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + events.length) % events.length);
    setIsAutoPlaying(false);
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % events.length);
    setIsAutoPlaying(false);
  };

  if (!events || events.length === 0) {
    return null;
  }

  const currentEvent = events[currentIndex];

  return (
    <div className="relative w-full h-[600px] rounded-3xl overflow-hidden group">
      {/* Background Image with Gradient Overlay */}
      <div className="absolute inset-0">
        <Image
          src={currentEvent.imageUrl}
          alt={currentEvent.title}
          fill
          className="object-cover transition-transform duration-700 group-hover:scale-105"
          priority
        />
        {/* Multi-layer gradient for better text readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent" />
      </div>

      {/* Content */}
      <div className="relative h-full flex flex-col justify-end p-12 md:p-16">
        <div className="max-w-3xl space-y-6 animate-fade-in">
          {/* Featured Badge */}
          <div className="flex items-center gap-3 flex-wrap">
            <Badge variant="primary" size="lg" icon={<Sparkles className="w-4 h-4" />}>
              Featured Event
            </Badge>
            {currentEvent.isVIP && (
              <Badge variant="vip" size="lg">
                VIP Access
              </Badge>
            )}
            <Badge variant="neutral" size="md">
              {currentEvent.category}
            </Badge>
          </div>

          {/* Title */}
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-tight">
            {currentEvent.title}
          </h1>

          {/* Description */}
          <p className="text-xl text-gray-200 line-clamp-2 max-w-2xl">
            {currentEvent.description}
          </p>

          {/* Event Details */}
          <div className="flex flex-wrap items-center gap-6 text-white">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-brand-400" />
              <span className="text-lg font-medium">
                {format(currentEvent.date, 'EEEE, MMMM d, yyyy')}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-brand-400" />
              <span className="text-lg font-medium">{currentEvent.location}</span>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-wrap items-center gap-4 pt-4">
            <Link href={`/events/${currentEvent.id}`}>
              <button className="px-8 py-4 bg-gradient-to-r from-brand-500 to-brand-600 text-white text-lg font-semibold rounded-2xl shadow-glow hover:shadow-hard hover:from-brand-600 hover:to-brand-700 transition-all duration-300 hover:scale-105 active:scale-95">
                Get Tickets
              </button>
            </Link>
            <Link href={`/events/${currentEvent.id}`}>
              <button className="px-8 py-4 bg-white/10 backdrop-blur-md text-white text-lg font-semibold rounded-2xl border-2 border-white/20 hover:bg-white/20 transition-all duration-300">
                Learn More
              </button>
            </Link>
          </div>
        </div>
      </div>

      {/* Navigation Arrows */}
      {events.length > 1 && (
        <>
          <button
            onClick={goToPrevious}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border-2 border-white/20 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-white/20 transition-all duration-300"
            aria-label="Previous event"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={goToNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border-2 border-white/20 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-white/20 transition-all duration-300"
            aria-label="Next event"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      )}

      {/* Pagination Dots */}
      {events.length > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2">
          {events.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`
                h-2 rounded-full transition-all duration-300
                ${index === currentIndex 
                  ? 'w-8 bg-white' 
                  : 'w-2 bg-white/40 hover:bg-white/60'
                }
              `}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
