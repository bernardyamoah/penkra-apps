import { afterEach, expect, spyOn, test } from 'bun:test'

import { createCanvasSceneGraph } from '@open-pencil/pen'
import { SceneGraph } from '@open-pencil/scene-graph'

const getNodeSpy = spyOn(SceneGraph.prototype, 'getNode')

afterEach(() => {
  getNodeSpy.mockClear()
})

function documentWithInstances(includeOverrides: boolean) {
  const componentChildren = Array.from({ length: 120 }, (_, index) => ({
    id: `child-${index}`,
    type: 'rectangle' as const,
    width: 10,
    height: 10,
    fill: '#000000'
  }))
  const instances = Array.from({ length: 40 }, (_, index) => ({
    id: `instance-${index}`,
    type: 'ref' as const,
    ref: 'component',
    ...(includeOverrides
      ? { descendants: { 'child-119': { fill: '#ff0000' } } }
      : {})
  }))

  return {
    version: '2.17',
    children: [
      {
        id: 'component',
        type: 'frame' as const,
        reusable: true,
        width: 1200,
        height: 10,
        children: componentChildren
      },
      ...instances
    ]
  }
}

test('descendant overrides use the clone address instead of rescanning each instance tree', () => {
  createCanvasSceneGraph(documentWithInstances(false))
  const baselineLookups = getNodeSpy.mock.calls.length

  getNodeSpy.mockClear()
  const graph = createCanvasSceneGraph(documentWithInstances(true))
  const overrideLookups = getNodeSpy.mock.calls.length

  expect(graph.getNode('instance-39/child-119')?.fills[0]?.color).toEqual({
    r: 1,
    g: 0,
    b: 0,
    a: 1
  })
  expect(overrideLookups - baselineLookups).toBeLessThan(400)
})
