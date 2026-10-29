import nodemailer from 'nodemailer';
import { env } from '../../core/config/env.js';
import logger from '../../core/utils/logger.js';

export default class NotificacionService {
  constructor() {
    // Puerto 465 = SSL directo (secure:true); 587 = STARTTLS (secure:false). Antes se
    // forzaba secure:true también con 587 (docker-compose), y el handshake TLS fallaba.
    const port = env.SMTP.PORT || 465;
    this.transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port,
      secure: port === 465,
      auth: {
        user: env.SMTP.USER,
        pass: env.SMTP.PASS, 
      },
    });
  }

  async enviarPasswordEmpleado(email, nombre, usuario, password) {
    const mailOptions = {
      from: `"Punto Cell " <${env.SMTP.USER}>`,
      to: email,
      subject: 'Bienvenido al equipo - Tus credenciales de acceso',
      html: `
        <div style="font-family: sans-serif; border: 1px solid #ddd; padding: 20px; max-width: 600px;">
          <h2 style="color: #2c3e50;">¡Hola, ${nombre}!</h2>
          <p>Te damos la bienvenida a <strong>Punto Cell</strong>. Se ha creado tu cuenta de acceso al sistema.</p>
          <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; border-left: 5px solid #3498db;">
            <p style="margin: 5px 0;"><strong>Usuario:</strong> ${usuario}</p>
            <p style="margin: 5px 0;"><strong>Contraseña temporal:</strong> <span style="color: #e74c3c; font-weight: bold;">${password}</span></p>
          </div>
          <p style="font-size: 0.9em; color: #7f8c8d; margin-top: 20px;">
            Por seguridad, te recomendamos cambiar tu contraseña en tu primer inicio de sesión.
          </p>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      return true;
    } catch (error) {
      logger.error('❌ Error al enviar el mail:', error);
      return false;
    }
  }

  async enviarCambioEstado(email, nombre, numOrden, nuevoEstado) {
    const ESTADOS = {
      2: {
        asunto: `Orden #${numOrden} — Tu equipo está siendo reparado`,
        color: '#2563eb',
        titulo: '¡Manos a la obra!',
        cuerpo: 'Nuestro técnico ya tiene tu equipo y comenzó con la reparación. Te avisaremos cuando esté listo.',
        badge: '🔧 En Reparación',
      },
      3: {
        asunto: `Orden #${numOrden} — ¡Tu equipo está listo!`,
        color: '#16a34a',
        titulo: '¡Reparación finalizada!',
        cuerpo: 'La reparación de tu equipo fue completada exitosamente. Ponete en contacto por WhatsApp para coordinar la entrega!.',
        badge: '✅ Terminado',
      },
      4: {
        asunto: `Orden #${numOrden} — Entrega confirmada`,
        color: '#7c3aed',
        titulo: '¡Gracias por elegirnos!',
        cuerpo: 'Tu equipo fue entregado. Esperamos que todo funcione perfecto. Si tenés algún inconveniente no dudes en contactarnos.',
        badge: '📦 Entregado',
      },
      5: {
        asunto: `Orden #${numOrden} — Orden cancelada`,
        color: '#dc2626',
        titulo: 'Tu orden fue cancelada',
        cuerpo: 'La orden de reparación fue anulada. Si creés que es un error o tenés dudas, comunicate con nosotros.',
        badge: '🚫 Anulado',
      },
      6: {
        asunto: `Orden #${numOrden} — Orden abandonada`,
        color: '#b45309',
        titulo: 'Tu equipo fue marcado como abandonado',
        cuerpo: 'Pasaron 60 días desde que la reparación quedó terminada sin retiro. La orden fue dada de baja y el equipo ingresó a inventario.',
        badge: '⏳ Abandonado',
      },
    };

    const config = ESTADOS[nuevoEstado];
    if (!config) return false;

    const mailOptions = {
      from: `"Punto Cell" <${env.SMTP.USER}>`,
      to: email,
      subject: config.asunto,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
          <div style="background-color: ${config.color}; padding: 24px 32px;">
            <h1 style="color: #fff; margin: 0; font-size: 1.4rem;">Punto Cell</h1>
            <p style="color: rgba(255,255,255,0.85); margin: 4px 0 0; font-size: 0.9rem;">Sistema de gestión de reparaciones</p>
          </div>

          <div style="padding: 32px;">
            <span style="display: inline-block; background-color: ${config.color}18; color: ${config.color}; font-weight: 700; font-size: 0.8rem; padding: 4px 12px; border-radius: 20px; margin-bottom: 16px;">
              ${config.badge}
            </span>

            <h2 style="color: #0f172a; margin: 0 0 12px;">${config.titulo}</h2>
            <p style="color: #475569; font-size: 0.95rem; line-height: 1.6; margin: 0 0 24px;">
              Hola <strong>${nombre}</strong>, ${config.cuerpo}
            </p>

            <div style="background-color: #f8fafc; border-left: 4px solid ${config.color}; padding: 14px 18px; border-radius: 4px;">
              <p style="margin: 0; font-size: 0.85rem; color: #64748b;">Número de orden: <strong style="color: #0f172a;">#${numOrden}</strong></p>
            </div>
          </div>

          <div style="background-color: #f1f5f9; padding: 16px 32px; text-align: center;">
            <p style="margin: 0; font-size: 0.8rem; color: #94a3b8;">Punto Cell — Este es un mensaje automático, no respondas este correo.</p>
          </div>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      return true;
    } catch (error) {
      logger.error(`❌ Error al enviar notificación de estado ${nuevoEstado}:`, error.message);
      return false;
    }
  }

  async enviarComprobanteEntrega(email, nombre, numOrden, pdfBase64) {
    const mailOptions = {
      from: `"Punto Cell" <${env.SMTP.USER}>`,
      to: email,
      subject: `Orden #${numOrden} — Tu comprobante de reparación`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
          <div style="background-color: #7c3aed; padding: 24px 32px;">
            <h1 style="color: #fff; margin: 0; font-size: 1.4rem;">Punto Cell</h1>
            <p style="color: rgba(255,255,255,0.85); margin: 4px 0 0; font-size: 0.9rem;">Comprobante de reparación</p>
          </div>
          <div style="padding: 32px;">
            <h2 style="color: #0f172a; margin: 0 0 12px;">¡Hola, ${nombre}!</h2>
            <p style="color: #475569; font-size: 0.95rem; line-height: 1.6; margin: 0 0 24px;">
              Adjunto encontrás el comprobante de tu reparación <strong>#${numOrden}</strong>. Guardalo como respaldo por cualquier consulta futura.
            </p>
            <div style="background-color: #f8fafc; border-left: 4px solid #7c3aed; padding: 14px 18px; border-radius: 4px;">
              <p style="margin: 0; font-size: 0.85rem; color: #64748b;">Número de orden: <strong style="color: #0f172a;">#${numOrden}</strong></p>
            </div>
          </div>
          <div style="background-color: #f1f5f9; padding: 16px 32px; text-align: center;">
            <p style="margin: 0; font-size: 0.8rem; color: #94a3b8;">Punto Cell — Este es un mensaje automático, no respondas este correo.</p>
          </div>
        </div>
      `,
      attachments: [{
        filename: `comprobante-orden-${numOrden}.pdf`,
        content: Buffer.from(pdfBase64, 'base64'),
        contentType: 'application/pdf',
      }],
    };

    try {
      await this.transporter.sendMail(mailOptions);
      logger.info(`✅ Comprobante de orden #${numOrden} enviado a ${email}`);
      return true;
    } catch (error) {
      logger.error(`❌ Error al enviar comprobante de orden #${numOrden}:`, error.message);
      return false;
    }
  }

  async enviarEmailRecuperacion(email, nombre, token) {
    const frontendUrl = env.APP.FRONTEND_URL;
    const resetLink = `${frontendUrl}/reset-password?token=${token}`;

    const mailOptions = {
      from: `"Punto Cell" <${env.SMTP.USER}>`,
      to: email,
      subject: 'Recuperación de contraseña - Punto Cell',
      html: `
        <div style="font-family: sans-serif; border: 1px solid #ddd; padding: 20px; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2c3e50;">¡Hola, ${nombre}!</h2>
          <p>Hemos recibido una solicitud para restablecer la contraseña de tu cuenta en el sistema de <strong>Punto Cell</strong>.</p>
          <p>Haz clic en el siguiente botón para crear una nueva contraseña. Por seguridad, este enlace expirará en <strong>15 minutos</strong>.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" style="background-color: #3498db; color: white; padding: 14px 28px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
              Restablecer mi contraseña
            </a>
          </div>
          
          <p style="font-size: 0.9em; color: #7f8c8d;">
            Si el botón no funciona, copia y pega la siguiente URL en tu navegador:<br>
            <a href="${resetLink}" style="color: #3498db; word-break: break-all;">${resetLink}</a>
          </p>
          
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
          
          <p style="font-size: 0.85em; color: #95a5a6;">
            Si no solicitaste este cambio, simplemente ignora este correo. Tu contraseña actual seguirá funcionando y tu cuenta está segura.
          </p>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      logger.info(`✅ Mail de recuperación enviado exitosamente a ${email}`);
      return true;
    } catch (error) {
      logger.error('❌ Error al enviar el mail de recuperación:', error);
      return false;
    }
  }
}