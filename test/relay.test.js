import { describe, expect, it } from 'bun:test'
import {
  qryExplode,
  replaceInterrogation,
  buildQueryObj,
  handleRelayRequest,
} from '../relay.js'

describe('a0-relay functions', () => {
  describe('qryExplode', () => {
    it('splits keywords by comma outside dollar signs', () => {
      const qry = 'OR content:test, AND title:math'
      const res = qryExplode(qry)
      expect(res).toEqual(['OR content:test', ' AND title:math'])
    })

    it('does not split commas inside dollar signs ($)', () => {
      const qry = 'OR content:$f(x, y)$, AND content:z'
      const res = qryExplode(qry)
      expect(res).toEqual(['OR content:$f(x, y)$', ' AND content:z'])
    })

    it('handles single query without comma', () => {
      const qry = 'OR content:simple'
      const res = qryExplode(qry)
      expect(res).toEqual(['OR content:simple'])
    })
  })

  describe('replaceInterrogation', () => {
    it('replaces ? with \\qvar{A}', () => {
      const res = replaceInterrogation('x^?')
      expect(res).toBe('x^\\qvar{A}')
    })

    it('skips letters already in string', () => {
      const res = replaceInterrogation('A = ? + ?')
      expect(res).toBe('A = \\qvar{B} + \\qvar{C}')
    })
  })

  describe('buildQueryObj', () => {
    it('builds standard query object with terms and math tex', () => {
      const rawQry = 'OR content:apple, AND title:$x^?$'
      const queryObj = buildQueryObj(rawQry, 2, '1.2.3.4', {
        city: 'Hanoi',
        region: 'HN',
        country: 'VN',
      })

      expect(queryObj.ip).toBe('1.2.3.4')
      expect(queryObj.page).toBe(2)
      expect(queryObj.geo).toEqual({
        city: 'Hanoi',
        region: 'HN',
        country: 'VN',
      })
      expect(queryObj.kw).toEqual([
        {
          type: 'term',
          op: 'OR',
          field: 'content',
          str: 'apple',
        },
        {
          type: 'tex',
          op: 'AND',
          field: 'title',
          str: 'x^\\qvar{A}',
        },
      ])
    })
  })

  describe('handleRelayRequest', () => {
    it('returns 400 when search-relay is called without q parameter', async () => {
      const req = new Request('http://localhost:19985/search-relay')
      const res = await handleRelayRequest(req)
      expect(res.status).toBe(400)
      const text = await res.text()
      expect(text).toContain('[search-relay] Bad GET Request!')
    })

    it('returns 204 on OPTIONS for CORS preflight', async () => {
      const req = new Request('http://localhost:19985/search-relay?q=test', {
        method: 'OPTIONS',
        headers: { Origin: 'http://localhost:3000' },
      })
      const res = await handleRelayRequest(req)
      expect(res.status).toBe(204)
      expect(res.headers.get('Access-Control-Allow-Origin')).toBe(
        'http://localhost:3000'
      )
    })

    it('returns null for non-relay routes', async () => {
      const req = new Request('http://localhost:19985/index.html')
      const res = await handleRelayRequest(req)
      expect(res).toBeNull()
    })
  })
})

