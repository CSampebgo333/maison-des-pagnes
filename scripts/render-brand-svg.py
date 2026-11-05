"""Render a new SVG icon using system librsvg/Cairo (no image manipulation)."""
import ctypes as C
from ctypes.util import find_library
import sys

rsvg = C.CDLL(find_library('rsvg-2') or 'librsvg-2.so.2')
cairo = C.CDLL(find_library('cairo') or 'libcairo.so.2')
gobject = C.CDLL(find_library('gobject-2.0') or 'libgobject-2.0.so.0')
rsvg.rsvg_handle_new_from_data.argtypes = [C.c_char_p, C.c_size_t, C.POINTER(C.c_void_p)]
rsvg.rsvg_handle_new_from_data.restype = C.c_void_p
rsvg.rsvg_handle_render_document.argtypes = [C.c_void_p, C.c_void_p, C.c_void_p, C.POINTER(C.c_void_p)]
rsvg.rsvg_handle_render_document.restype = C.c_int
cairo.cairo_image_surface_create.argtypes = [C.c_int, C.c_int, C.c_int]
cairo.cairo_image_surface_create.restype = C.c_void_p
cairo.cairo_create.argtypes = [C.c_void_p]
cairo.cairo_create.restype = C.c_void_p
cairo.cairo_surface_write_to_png.argtypes = [C.c_void_p, C.c_char_p]
cairo.cairo_surface_write_to_png.restype = C.c_int
cairo.cairo_destroy.argtypes = [C.c_void_p]
cairo.cairo_surface_destroy.argtypes = [C.c_void_p]
gobject.g_object_unref.argtypes = [C.c_void_p]

class Rectangle(C.Structure):
    _fields_ = [(key, C.c_double) for key in ('x', 'y', 'width', 'height')]

size = int(sys.argv[2])
svg = sys.stdin.buffer.read()
error = C.c_void_p()
handle = rsvg.rsvg_handle_new_from_data(svg, len(svg), C.byref(error))
if not handle:
    raise RuntimeError('Invalid logo SVG')
surface = cairo.cairo_image_surface_create(0, size, size)
context = cairo.cairo_create(surface)
try:
    viewport = Rectangle(0, 0, size, size)
    if not rsvg.rsvg_handle_render_document(handle, context, C.byref(viewport), C.byref(error)):
        raise RuntimeError('Logo rendering failed')
    if cairo.cairo_surface_write_to_png(surface, sys.argv[1].encode()):
        raise RuntimeError('Logo PNG could not be written')
finally:
    cairo.cairo_destroy(context)
    cairo.cairo_surface_destroy(surface)
    gobject.g_object_unref(handle)
