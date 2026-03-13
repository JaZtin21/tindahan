package domain

import "time"

type SuccessResponse struct {
	Success   bool        `json:"success"`
	Message   string      `json:"message"`
	Data      interface{} `json:"data,omitempty"`
	Timestamp time.Time   `json:"timestamp"`
}

type ErrorResponse struct {
	Success   bool        `json:"success"`
	Error     string      `json:"error"`
	Message   string      `json:"message"`
	Details   interface{} `json:"details,omitempty"`
	Timestamp time.Time   `json:"timestamp"`
}

type PaginationResponse struct {
	Page       int         `json:"page"`
	Limit      int         `json:"limit"`
	Total      int64       `json:"total"`
	TotalPages int         `json:"total_pages"`
	Data       interface{} `json:"data"`
}

func NewSuccessResponse(message string, data interface{}) SuccessResponse {
	return SuccessResponse{
		Success:   true,
		Message:   message,
		Data:      data,
		Timestamp: time.Now(),
	}
}

func NewErrorResponse(error, message string, details interface{}) ErrorResponse {
	return ErrorResponse{
		Success:   false,
		Error:     error,
		Message:   message,
		Details:   details,
		Timestamp: time.Now(),
	}
}

func NewPaginationResponse(page, limit int, total int64, data interface{}) PaginationResponse {
	totalPages := int((total + int64(limit) - 1) / int64(limit))
	
	return PaginationResponse{
		Page:       page,
		Limit:      limit,
		Total:      total,
		TotalPages: totalPages,
		Data:       data,
	}
}
