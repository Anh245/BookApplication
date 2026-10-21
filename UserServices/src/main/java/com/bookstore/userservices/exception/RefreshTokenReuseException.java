package com.bookstore.userservices.exception;

import org.springframework.http.HttpStatus;

/** The family revocation must commit even though the refresh request returns 401. */
public class RefreshTokenReuseException extends AppException {
    public RefreshTokenReuseException() {
        super("Refresh token đã được sử dụng; phiên đã bị thu hồi. Vui lòng đăng nhập lại", HttpStatus.UNAUTHORIZED);
    }
}
