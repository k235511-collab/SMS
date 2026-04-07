"use client"

import { useEffect, useCallback } from "react"
import { useSession } from "@/context/session-context"

/**
 * Calls the provided callback whenever the selected campus changes or
 * when dependencies change. Useful to centralize the campus refetch pattern.
 *
 * Usage: useCampusRefetch(() => { fetchData() }, [otherDeps])
 */
export function useCampusRefetch(cb: () => void, deps: any[] = []) {
  const { selectedCampus } = useSession()

  const callback = useCallback(cb, deps)

  useEffect(() => {
    // Invoke callback when hook mounts and whenever selectedCampus.id changes
    callback()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCampus?.id])
}

export default useCampusRefetch
