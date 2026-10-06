const fs = require('fs');
const path = require('path');

const walkSync = function(dir, filelist) {
  const files = fs.readdirSync(dir);
  filelist = filelist || [];
  files.forEach(function(file) {
    if (fs.statSync(path.join(dir, file)).isDirectory()) {
      filelist = walkSync(path.join(dir, file), filelist);
    } else {
      if (file.endsWith('.js') || file.endsWith('.jsx')) {
        filelist.push(path.join(dir, file));
      }
    }
  });
  return filelist;
};

const files = walkSync('./PuntoCell_WebPage/src');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf-8');
  
  // Also fix window.alert
  if (content.includes('alert(') || content.includes('window.alert(')) {
    // If we need to replace alerts, let's inject import
    let modified = false;
    
    // Replace alert(...) with smart toast
    const newContent = content.replace(/(window\.)?alert\((.*?)\)/g, (match, windowGroup, p1) => {
      modified = true;
      const lower = p1.toLowerCase();
      if (lower.includes('éxito') || lower.includes('completado') || lower.includes('✅')) {
        return `toast.success(${p1})`;
      } else if (lower.includes('error') || lower.includes('❌') || lower.includes('no se pudo') || lower.includes('⚠️')) {
        return `toast.error(${p1})`;
      } else {
        return `toast.warning(${p1})`;
      }
    });
    
    if (modified) {
      // Inject import if not exists
      if (!newContent.includes("from 'sonner'") && !newContent.includes('from "sonner"')) {
        // Find the last import statement to insert after it, or insert at top
        const importMatch = newContent.match(/import .* from .*;?\n?/g);
        if (importMatch && importMatch.length > 0) {
          const lastImport = importMatch[importMatch.length - 1];
          content = newContent.replace(lastImport, lastImport + "import { toast } from 'sonner';\n");
        } else {
          content = "import { toast } from 'sonner';\n" + newContent;
        }
      } else {
        content = newContent;
      }
      
      fs.writeFileSync(file, content, 'utf-8');
      console.log(`Modified ${file}`);
    }
  }
});
console.log("Done");
