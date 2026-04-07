import { registerAs as nestRegisterAs } from '@nestjs/config'

interface ConfigField {
  env: string
  default?: string | number | boolean
  required?: boolean
  transform?: (value: string) => unknown
}

type ConfigSchema = Record<string, ConfigField>
type ConfigResult<T extends ConfigSchema> = {
  [K in keyof T]: T[K]['transform'] extends (...args: unknown[]) => infer R
    ? R
    : T[K]['default'] extends number
      ? number
      : string
}

/**
 * Type-safe wrapper around NestJS registerAs that reads from process.env
 * with validation for required fields.
 */
export function registerAs<T extends ConfigSchema>(namespace: string, schema: T) {
  return nestRegisterAs(namespace, (): ConfigResult<T> => {
    const config = {} as Record<string, unknown>
    const missing: string[] = []

    for (const [key, field] of Object.entries(schema)) {
      const raw = process.env[field.env]

      if (raw === undefined || raw === '') {
        if (field.required) {
          missing.push(field.env)
          continue
        }
        config[key] = field.default
      } else {
        config[key] = field.transform ? field.transform(raw) : raw
      }
    }

    if (missing.length > 0) {
      throw new Error(
        `Missing required environment variables: ${missing.join(', ')}`,
      )
    }

    return config as ConfigResult<T>
  })
}
