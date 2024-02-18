/**
 * Simple logging with pino for server-side
 * @ignore
 */

import pino from 'pino'
// import { createWriteStream } from 'fs-extra'
// import { PassThrough } from 'stream'
// import { stdout } from 'process'

import { nodeVersion, isDev, LOG_FILE } from './consts'

// const logThrough = new PassThrough()

// const logger = pino( {
//   prettyPrint: isDev && { colorize: true, ignore: 'hostname,pid', translateTime: 'HH:MM:ss.l' },
// }, logThrough )

// // Only write to file in electron production builds
// if ( electronVersion && !isDev ) logThrough.pipe( createWriteStream( LOG_FILE, { flags: 'a' } ) )

// // Pipe all log output to stdout in dev only
// if ( isDev ) logThrough.pipe( stdout )


// multiple destinations: log + file 
// const streams = [
//     { stream : process.stdout }, 
//     { stream : pino.destination({
//         dest: LOG_FILE, 
//         append: true,
//         sync: true
//     })}, 
// ]

// another multi-destination example
// const transport = pino.transport({
//   targets: [
//     {
//       target: 'pino/file',
//       options: { destination: `${__dirname}/app.log***` },
//     },
//     {
//       target: 'pino/file', // logs to the standard output by default
//     },
//     // {
//     //   target: 'pino-pretty',
//     //    options: {
//     //     colorize: true
//     //    }
//     // },  
//   ],
// });


// const fileTransport = pino.transport({
//   target: 'pino/file',
//   options: { destination: `${__dirname}/app.log` },
// });


const logger = pino({
    level: process.env.LOG_LEVEL || 'info',
    // Note that the formatters.level function cannot be used when logging to multiple destination. 
    // If you leave it in, you will get the following error:
    // Error: option.transport.targets do not allow custom level formatters
    formatters: {
        // bindings: (bindings) => {
        //     return { 
        //         pid: bindings.pid, 
        //         host: bindings.hostname,
        //         node_version: process.version
        //     };
        // },
        level: (label) => {
            return { severity: label.toUpperCase() };
        },
    },
    // timestamp: pino.stdTimeFunctions.isoTime,
    timestamp: () => `,"timestamp":"${new Date(Date.now()).toISOString()}"`,
    // base: undefined
    base: {
        env: process.env.NODE_ENV,
        revision: process.env.VERCEL_GITHUB_COMMIT_SHA,
    },
    transport: {
        target: 'pino-pretty',
        options: {
            colorize: true
        }
    }
}, 
// pino.multistream(streams)

// runs in the main thread
// pino.destination(`${__dirname}/app.log`)
pino.destination(process.stdout)

//runs in a worker thread, 
// recommended only when you're logging to multiple destinations at once
// such as to a local file and a third-party log management service.
// https://betterstack.com/community/guides/logging/how-to-install-setup-and-use-pino-to-log-node-js-applications/#transporting-your-node-js-logs
// fileTransport

// multi-dest transport
// transport
)

export default logger