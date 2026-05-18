const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API de Sweety Puppies',
      version: '1.0.0',
      description:
        'Documentación modular de la API de Sweety Puppies. Incluye autenticación, portal del cliente, operación administrativa, contenido y reportes.',
    },
    servers: [
      {
        url: 'http://localhost:3000/api',
        description: 'Servidor local de desarrollo',
      },
    ],
    tags: [
      { name: 'Auth', description: 'Autenticación, registro, recuperación de contraseña y perfil.' },
      { name: 'Cliente Mascotas', description: 'Gestión de mascotas desde el portal del cliente.' },
      { name: 'Cliente Citas', description: 'Agendamiento, cotización y reprogramación de citas del cliente.' },
      { name: 'Cliente Historial', description: 'Historial y detalle de citas del cliente.' },
      { name: 'Admin Gestión de Citas', description: 'Centro operativo para atención, cancelación y finalización de citas.' },
      { name: 'Admin Agenda', description: 'Agenda administrativa, bloqueos y confirmaciones rápidas.' },
      { name: 'Admin Clientes', description: 'Consulta y edición del perfil de clientes.' },
      { name: 'Admin Mascotas', description: 'Consulta, edición e historial de mascotas.' },
      { name: 'Admin Servicios', description: 'Catálogo de servicios principales y adicionales.' },
      { name: 'Contenido', description: 'Publicaciones visuales del portal y contenido activo para cliente.' },
      { name: 'Reportes', description: 'Reportes financieros y operativos del negocio.' },
      { name: 'Legacy / Deprecated', description: 'Compatibilidad temporal con rutas heredadas del sistema anterior.' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Token JWT obtenido al iniciar sesión. Debe enviarse como `Bearer <token>`.',
        },
      },
      schemas: {
        SuccessFlag: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
          },
          required: ['success'],
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false,
            },
            message: {
              type: 'string',
              example: 'Ocurrió un error al procesar la solicitud',
            },
          },
          required: ['success', 'message'],
        },
        MessageResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            message: {
              type: 'string',
              example: 'Operación realizada correctamente',
            },
          },
          required: ['success', 'message'],
        },
        IdPathParam: {
          type: 'string',
          format: 'uuid',
          example: '5dcfb0bb-67c0-4a5d-bf6d-2330c2dcb3f6',
        },
        SearchQueryValue: {
          type: 'string',
          example: 'dylan',
        },
        ReportFilterEnvelope: {
          type: 'object',
          properties: {
            periodo: {
              type: 'string',
              enum: ['day', 'week', 'month', 'range'],
              example: 'month',
            },
            fechaReferencia: {
              type: 'string',
              format: 'date',
              nullable: true,
              example: '2026-04-23',
            },
            fechaInicio: {
              type: 'string',
              format: 'date',
              example: '2026-04-01',
            },
            fechaFin: {
              type: 'string',
              format: 'date',
              example: '2026-04-30',
            },
            label: {
              type: 'string',
              example: 'Mes 2026-04',
            },
          },
        },
        TrendPoint: {
          type: 'object',
          properties: {
            key: {
              type: 'string',
              example: '2026-04-01',
            },
            label: {
              type: 'string',
              example: '01 Abr',
            },
            value: {
              type: 'number',
              example: 185000,
            },
          },
        },
      },
      parameters: {
        PathId: {
          in: 'path',
          name: 'id',
          required: true,
          schema: {
            $ref: '#/components/schemas/IdPathParam',
          },
        },
        SearchQuery: {
          in: 'query',
          name: 'search',
          required: false,
          schema: {
            $ref: '#/components/schemas/SearchQueryValue',
          },
        },
        ReportPeriod: {
          in: 'query',
          name: 'periodo',
          required: false,
          schema: {
            type: 'string',
            enum: ['day', 'week', 'month', 'range'],
            default: 'month',
          },
          description: 'Tipo de período a consultar.',
        },
        ReportDate: {
          in: 'query',
          name: 'fecha',
          required: false,
          schema: {
            type: 'string',
            format: 'date',
            example: '2026-04-23',
          },
          description: 'Fecha de referencia cuando el período es day, week o month.',
        },
        ReportStartDate: {
          in: 'query',
          name: 'fechaInicio',
          required: false,
          schema: {
            type: 'string',
            format: 'date',
            example: '2026-04-01',
          },
          description: 'Fecha inicial obligatoria cuando el período es range.',
        },
        ReportEndDate: {
          in: 'query',
          name: 'fechaFin',
          required: false,
          schema: {
            type: 'string',
            format: 'date',
            example: '2026-04-30',
          },
          description: 'Fecha final obligatoria cuando el período es range.',
        },
      },
      responses: {
        BadRequest: {
          description: 'La solicitud no cumple con las validaciones del módulo.',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse',
              },
              examples: {
                validation: {
                  value: {
                    success: false,
                    message: 'Debes indicar el motivo de cancelación',
                  },
                },
              },
            },
          },
        },
        Unauthorized: {
          description: 'No se envió el token de autenticación requerido.',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse',
              },
              examples: {
                missingToken: {
                  value: {
                    success: false,
                    message: 'Token de acceso requerido',
                  },
                },
              },
            },
          },
        },
        Forbidden: {
          description: 'El token es inválido, expiró o el rol no tiene permisos.',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse',
              },
              examples: {
                invalidRole: {
                  value: {
                    success: false,
                    message: 'No tienes permisos para acceder a este recurso',
                  },
                },
              },
            },
          },
        },
        NotFound: {
          description: 'No se encontró el recurso solicitado.',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse',
              },
              examples: {
                notFound: {
                  value: {
                    success: false,
                    message: 'Recurso no encontrado',
                  },
                },
              },
            },
          },
        },
        InternalServerError: {
          description: 'Ocurrió un problema inesperado del lado del servidor.',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse',
              },
              examples: {
                serverError: {
                  value: {
                    success: false,
                    message: 'Ocurrió un error inesperado al procesar la solicitud',
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  apis: ['./routes/*.js'],
};

const swaggerSpec = swaggerJSDoc(options);

module.exports = { swaggerUi, swaggerSpec };
