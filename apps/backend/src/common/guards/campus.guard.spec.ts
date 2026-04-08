import { ExecutionContext, ForbiddenException } from '@nestjs/common'
import { CampusGuard } from './campus.guard'

describe('CampusGuard', () => {
  const prisma = {
    unscopedClient: {
      user: {
        findUnique: jest.fn(),
      },
    },
  } as any

  const guard = new CampusGuard(prisma)

  const createContext = (request: any): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    }) as ExecutionContext

  beforeEach(() => {
    prisma.unscopedClient.user.findUnique.mockReset()
  })

  it('injects the assigned campus when a campus-scoped user omits the header', async () => {
    prisma.unscopedClient.user.findUnique.mockResolvedValue({
      campusId: 'campus-a',
      role: { slug: 'teacher' },
    })
    const request = {
      user: { userId: 'user-1', isPlatformAdmin: false },
      headers: {},
    }

    await expect(guard.canActivate(createContext(request))).resolves.toBe(true)
    expect(request.headers['x-campus-id']).toBe('campus-a')
  })

  it('rejects access to another campus for campus-scoped users', async () => {
    prisma.unscopedClient.user.findUnique.mockResolvedValue({
      campusId: 'campus-a',
      role: { slug: 'teacher' },
    })
    const request = {
      user: { userId: 'user-1', isPlatformAdmin: false },
      headers: { 'x-campus-id': 'campus-b' },
    }

    await expect(guard.canActivate(createContext(request))).rejects.toBeInstanceOf(
      ForbiddenException,
    )
  })

  it('allows unrestricted users without a campus assignment', async () => {
    prisma.unscopedClient.user.findUnique.mockResolvedValue({
      campusId: null,
      role: { slug: 'admin' },
    })
    const request = {
      user: { userId: 'user-2', isPlatformAdmin: false },
      headers: {},
    }

    await expect(guard.canActivate(createContext(request))).resolves.toBe(true)
    expect(request.headers['x-campus-id']).toBeUndefined()
  })
})
