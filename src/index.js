
// const fs = require('fs')
// const crypto = require('crypto')
// const path = require('path')
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';


export const persistentCachePlugin = () => {
  let _server = null
  let cache = {}
  let fileMd5Cache = {}
  const currentMd5 = {}
  const cachePath = path.resolve('./', 'node_modules/.vite/cache/')
  function debounce(handle, time = 1000, immediate = false) {
    let timer = null
    return (...args) => {
      if (immediate) {
        handle.apply(this, args)
        immediate = false
        return
      }
      clearTimeout(timer)
      timer = setTimeout(() => {
        handle.apply(this, args)
      }, time)
    }
  }

  return {
    name: 'persistent-cache-plugin',
    configureServer: async server => {
      _server = server
      server.middlewares.use((req, res, next) => {
        if (cache[req.url]) {
          const ifNoneMatch = req.headers['if-none-match']
          if (ifNoneMatch && cache[req.url] === ifNoneMatch) {
            const { moduleGraph, transformRequest } = server
            if (
              moduleGraph.urlToModuleMap.size &&
              moduleGraph.urlToModuleMap.get(req.url) &&
              moduleGraph.urlToModuleMap.get(req.url).transformResult
            ) {
              next()
              return
            } else {
              res.statusCode = 304
              setTimeout(() => {
                transformRequest(req.url, server, {
                  html: req.headers.accept?.includes('text/html')
                })
              }, 3000)
              return res.end()
            }
          }
        }
        next()
      })
    },

    buildStart: async () => {
      console.log('buildStart--->')
      if (fs.existsSync(cachePath + '/cache.json')) {
        cache = require(cachePath + '/cache.json')
      }

      if (fs.existsSync(cachePath + '/fileMd5Cache.json')) {
        fileMd5Cache = require(cachePath + '/fileMd5Cache.json')
        for (const key in fileMd5Cache) {
          const filePath = key.split('?')[0]
          const packageJson = fs.readFileSync('.' + filePath)
          const md5 = crypto.createHash('md5')
          currentMd5[key] = md5.update(packageJson).digest('base64')
          if (currentMd5[key] !== fileMd5Cache[key]) {
            console.log('改动--->', key)
            cache[key] = null
          }
        }
      }

      process.once('SIGINT', async () => {
        try {
          await _server.close()
        } finally {
          process.exit()
        }
      })
    },

    buildEnd: async () => {
      if (!fs.existsSync(cachePath)) {
        fs.mkdirSync(cachePath)
      }
      // 缓存所有文件
      for (const [key, value] of _server.moduleGraph.urlToModuleMap) {
        if (value.transformResult && value.transformResult.etag) {
          cache[key] = value.transformResult.etag
        }
      }
      fs.writeFileSync(
        cachePath + '/cache.json',
        JSON.stringify(cache),
        err => {
          console.log(err)
        }
      )

      fs.writeFileSync(
        cachePath + '/fileMd5Cache.json',
        JSON.stringify(currentMd5),
        err => {
          console.log(err)
        }
      )
      console.log('buildEnd--->')
    },

    transform: async (code, map) => {
      const key = map.replace(projectRootDir, '')
      if (!key.includes('export-helper')) {
        // 获取package.json文件内容，并生成md5,并存入 fileMd5Cache.json
        const filePath = key.split('?')[0]
        console.log(filePath)
        const packageJson = fs.readFileSync('.' + filePath)
        const md5 = crypto.createHash('md5')
        currentMd5[key] = md5.update(packageJson).digest('base64')
        // 文件内容变化需删除缓存中对应的数据
        if (fileMd5Cache[key] !== currentMd5[key]) {
          console.log('改动--->', key, fileMd5Cache[key], currentMd5[key])
          debounce(() => {
            // 修改cache.json中的数据
            // 修改fileMd5Cache.json中的数据
            fs.writeFileSync(
              cachePath + '/cache.json',
              JSON.stringify(cache),
              err => {
                console.log(err)
              }
            )

            fs.writeFileSync(
              cachePath + '/fileMd5Cache.json',
              JSON.stringify(currentMd5),
              err => {
                console.log(err)
              }
            )
          }, 3000)
        }
      }
    }
  }
}