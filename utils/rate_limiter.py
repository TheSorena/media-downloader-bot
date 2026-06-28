import time


class RateLimiter:
    def __init__(self, max_requests: int = 3, window_seconds: int = 60):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._requests: dict[int, list[float]] = {}

    def _clean_old(self, user_id: int):
        now = time.time()
        if user_id in self._requests:
            self._requests[user_id] = [
                ts for ts in self._requests[user_id]
                if now - ts < self.window_seconds
            ]

    def is_allowed(self, user_id: int) -> bool:
        self._clean_old(user_id)
        if user_id not in self._requests:
            self._requests[user_id] = []
        if len(self._requests[user_id]) >= self.max_requests:
            return False
        self._requests[user_id].append(time.time())
        return True

    def seconds_until_allowed(self, user_id: int) -> int:
        self._clean_old(user_id)
        if user_id not in self._requests or not self._requests[user_id]:
            return 0
        oldest = self._requests[user_id][0]
        wait = self.window_seconds - (time.time() - oldest)
        return max(0, int(wait))


rate_limiter = RateLimiter(max_requests=3, window_seconds=60)
