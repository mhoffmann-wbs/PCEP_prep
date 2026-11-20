import type { RouteObject } from 'react-router'
import { Layout } from './Layout'
import { Home } from '../pages/Home'

const placeholder = (title: string) => () => <h1 className="text-2xl font-semibold">{title}</h1>

export const routes: RouteObject[] = [
  {
    element: <Layout />,
    children: [
      { index: true, element: <Home /> },
      { path: 'learn', Component: placeholder('Learn') },
      { path: 'check', Component: placeholder('Check') },
      { path: 'do', Component: placeholder('Do') },
      { path: '*', Component: placeholder('Page not found') },
    ],
  },
]
