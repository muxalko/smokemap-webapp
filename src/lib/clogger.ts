/**
 * Simple logging with pino for client side
 * @ignore
 */
"use client"
import pino from 'pino'

const clogger = pino({
  level: process.env.NEXT_PUBLIC_LOG_LEVEL || 'info',
  browser: {
     asObject: true,
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

export default clogger