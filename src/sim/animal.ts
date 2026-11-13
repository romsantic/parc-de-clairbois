import { SPECIES } from '../data/species'
import { TUNING, HOUR_MS } from '../data/tuning'
import type { Animal } from './types'

export type AgeStage = 'bebe' | 'jeune' | 'adulte'

/** Bébé avant 1× la gestation, jeune avant 2×, adulte ensuite. */
export function ageStage(a: Animal, nowMs: number): AgeStage {
  const ageH = (nowMs - a.bornAt) / HOUR_MS, g = SPECIES[a.species].gestationH
  return ageH < g ? 'bebe' : ageH < 2 * g ? 'jeune' : 'adulte'
}

export const hoursWithoutFood = (a: Animal, nowMs: number): number => Math.max(0, (nowMs - a.lastFedAt) / HOUR_MS)

export const isHungry = (a: Animal, nowMs: number): boolean => hoursWithoutFood(a, nowMs) >= TUNING.HUNGRY_AFTER_H

/** 1 tant qu'il mange ; baisse jusqu'à 0 en 12 h sans nourriture. */
export function satiety(a: Animal, nowMs: number): number {
  return Math.max(0, 1 - hoursWithoutFood(a, nowMs) / TUNING.HUNGRY_AFTER_H)
}
