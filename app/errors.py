from __future__ import annotations


class AppError(Exception):
    def __init__(
        self,
        message: str,
        *,
        status_code: int,
        error_code: str,
        retryable: bool = False,
    ) -> None:
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.error_code = error_code
        self.retryable = retryable
