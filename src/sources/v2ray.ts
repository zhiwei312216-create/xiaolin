import type { SourceGetter } from '../model'

const _: SourceGetter = async () => {
  const source = 'https://raw.githubusercontent.com/free-nodes/v2rayfree/refs/heads/main/README.md'

  const readme = await (await Bun.fetch(source, { method: 'GET' })).text()

  const indexBegin = readme.indexOf('```') + 3
  const indexEnd = readme.lastIndexOf('```')

  const subs = readme.slice(indexBegin, indexEnd).split('\n')

  return subs
}

export default _