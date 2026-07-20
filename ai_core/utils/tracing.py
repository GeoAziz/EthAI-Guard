import uuid
import logging
from typing import Optional, Dict

logger = logging.getLogger(__name__)

class TraceContext:
    def __init__(self, trace_id: Optional[str] = None, span_id: Optional[str] = None):
        self.trace_id = trace_id or uuid.uuid4().hex
        self.span_id = span_id or uuid.uuid4().hex[:16]

    @classmethod
    def from_headers(cls, headers: Dict) -> 'TraceContext':
        """Extract trace context from request headers (W3C traceparent format)"""
        trace_id = headers.get('x-trace-id') or headers.get('X-Trace-Id')
        span_id = headers.get('x-span-id') or headers.get('X-Span-Id')

        if not trace_id:
            # Parse W3C traceparent header: 00-traceid-spanid-flags
            traceparent = headers.get('traceparent') or headers.get('Traceparent')
            if traceparent:
                parts = traceparent.split('-')
                if len(parts) >= 3:
                    trace_id = parts[1]
                    span_id = parts[2]

        return cls(trace_id, span_id)

    def to_headers(self) -> Dict[str, str]:
        """Convert trace context to headers for propagation"""
        return {
            'x-trace-id': self.trace_id,
            'x-span-id': self.span_id,
            'traceparent': f'00-{self.trace_id}-{self.span_id}-01',
        }


def init_tracing():
    """Initialize distributed tracing (W3C traceparent + custom headers)"""
    logger.info("Distributed tracing initialized (W3C traceparent + custom headers)")
