# Biblioteca JFR

Sitio estático para el catálogo y los préstamos de la biblioteca del Colegio Técnico José Félix Restrepo I.E.D. La aplicación usa Firebase Authentication y Cloud Firestore desde el navegador, por lo que GitHub Pages es suficiente para publicarla.

## Antes de publicar

1. En `app.js`, pega el `firebaseConfig` de la app web de Firebase.
2. En `app.js`, cambia `ADMIN_EMAIL` por el correo real del bibliotecario.
3. Conserva el `logo.jpg` original en esta misma carpeta. El ZIP recibido no lo traía, así que no fue reemplazado ni inventado.
4. Copia el contenido de `firestore.rules` en Firebase Console → Firestore Database → Reglas y publícalo. Ese archivo es de configuración de Firebase, no debe subirse al repositorio público.

## Firebase

- Crea el proyecto sin Analytics.
- En Authentication activa el proveedor **Correo electrónico/contraseña**.
- Crea primero la cuenta del bibliotecario con el correo que pusiste en `ADMIN_EMAIL`.
- En Authentication → Settings → Authorized domains agrega el dominio de GitHub Pages, por ejemplo `tuusuario.github.io`.
- Crea Firestore en modo producción y publica las reglas.

La cuenta del bibliotecario entra escribiendo su correo en el campo de acceso. El estudiantado entra con su TI y una contraseña de mínimo 6 caracteres. Los datos personales solo aparecen al dueño de la cuenta y al bibliotecario, según las reglas.

## GitHub Pages

1. Crea un repositorio público vacío.
2. Sube `index.html`, `app.js`, `logo.jpg` y este README.
3. En Settings → Pages selecciona `Deploy from a branch`, rama `main` y carpeta `/ (root)`.
4. Cuando GitHub muestre la URL, agrega únicamente su dominio —por ejemplo `tuusuario.github.io`— en Firebase Authorized domains.

No abras `index.html` haciendo doble clic para probar Firebase: los módulos y la autenticación necesitan una URL `http://` o `https://`.
