import 'reflect-metadata'
import { ExecutionContext, ForbiddenException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { PermissionsGuard } from './permissions.guard'
import { PERMISSIONS_KEY } from '../decorators'

describe('PermissionsGuard', () => {
  const prisma = {
    user: {
      findUnique: jest.fn(),
    },
  } as any

  const reflector = new Reflector()
  const guard = new PermissionsGuard(reflector, prisma)

  const handler = () => undefined
  class TestController {}

  const createContext = (request: any): ExecutionContext =>
    ({
      getHandler: () => handler,
      getClass: () => TestController,
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    }) as ExecutionContext

  beforeEach(() => {
    prisma.user.findUnique.mockReset()
    Reflect.deleteMetadata(PERMISSIONS_KEY, handler)
    Reflect.deleteMetadata(PERMISSIONS_KEY, TestController)
  })

  it('allows requests when no permission metadata is present', async () => {
    const request = { user: null }

    await expect(guard.canActivate(createContext(request))).resolves.toBe(true)
  })

  it('rejects authenticated users missing required permissions', async () => {
    Reflect.defineMetadata(PERMISSIONS_KEY, ['students.read'], handler)
    prisma.user.findUnique.mockResolvedValue({
      role: {
        slug: 'teacher',
        permissions: [],
      },
    })
    const request = { user: { userId: 'user-1', isPlatformAdmin: false } }

    await expect(guard.canActivate(createContext(request))).rejects.toBeInstanceOf(
      ForbiddenException,
    )
  })

  it('allows users with the required permission and caches the result', async () => {
    Reflect.defineMetadata(PERMISSIONS_KEY, ['students.read'], handler)
    prisma.user.findUnique.mockResolvedValue({
      role: {
        slug: 'teacher',
        permissions: [{ permission: { slug: 'students.read' } }],
      },
    })
    const request = { user: { userId: 'user-1', isPlatformAdmin: false } }

    await expect(guard.canActivate(createContext(request))).resolves.toBe(true)
    await expect(guard.canActivate(createContext(request))).resolves.toBe(true)
    expect(prisma.user.findUnique).toHaveBeenCalledTimes(1)
  })

  it('allows super admins through the sentinel permission set', async () => {
    Reflect.defineMetadata(PERMISSIONS_KEY, ['students.read'], handler)
    prisma.user.findUnique.mockResolvedValue({
      role: {
        slug: 'super_admin',
        permissions: [],
      },
    })
    const request = { user: { userId: 'user-2', isPlatformAdmin: false } }

    await expect(guard.canActivate(createContext(request))).resolves.toBe(true)
  })
})
