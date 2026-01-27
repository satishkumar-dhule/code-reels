/**
 * Lazy-loaded Mobile Components
 * Code-split for better performance
 */

import { lazy } from 'react';

// Lazy load components for code splitting
export const BottomSheet = lazy(() => import('./BottomSheet').then(m => ({ default: m.BottomSheet })));
export const FloatingButton = lazy(() => import('./FloatingButton').then(m => ({ default: m.FloatingButton })));
export const PullToRefresh = lazy(() => import('./PullToRefresh').then(m => ({ default: m.PullToRefresh })));
export const SwipeableCard = lazy(() => import('./SwipeableCard').then(m => ({ default: m.SwipeableCard })));
export const Skeleton = lazy(() => import('./SkeletonLoader').then(m => ({ default: m.Skeleton })));
export const SkeletonCard = lazy(() => import('./SkeletonLoader').then(m => ({ default: m.SkeletonCard })));
export const SkeletonList = lazy(() => import('./SkeletonLoader').then(m => ({ default: m.SkeletonList })));
export const SkeletonText = lazy(() => import('./SkeletonLoader').then(m => ({ default: m.SkeletonText })));
