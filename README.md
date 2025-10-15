# Genealogy App Specification (Windows & macOS)

## 1. Overview
A desktop application that allows users to create, manage, and explore their family tree. The app supports manual data entry and import from standard genealogy formats. Users can visualize family relationships, search and filter data, and attach media (photos, documents).  

## 2. Target Platforms
- **Operating Systems**: Windows 10+, macOS 12+  
- **Architecture**: x64, ARM64 (where possible)  
- **Distribution**: Microsoft Store (.msix), Mac App Store (.dmg/.pkg)  

## 3. Core Features
### 3.1 Family Tree Management
- Create a new family tree from scratch.  
- Add individuals (name, birth/death dates, gender, occupation, etc.).  
- Add relationships: parent-child, spouses, siblings.  
- Support multiple family trees in one account/profile.  

### 3.2 Visualization
- Interactive tree view (pan, zoom, drag).  
- Timeline view (chronological order of events).  
- Pedigree view (ancestors and descendants).  
- Color-coded relationship lines (marriage, child, adoption).  

### 3.3 Search & Filtering
- Quick search by name, date, or place.  
- Advanced filters (e.g., “show all ancestors born before 1850”).  
- Highlight incomplete or missing information (e.g., unknown parents).  

### 3.4 Data Import & Export
- Import from **GEDCOM** format (standard genealogy format).  
- Export to GEDCOM, PDF (printable tree), CSV (basic data).  
- **All data is stored and managed locally (no cloud features).**  

### 3.5 Media & Notes
- Attach photos, scanned documents, or audio notes to individuals.  
- Metadata support (date, source, description).  
- Link media files to multiple individuals.  

## 4. Non-Functional Requirements
- **Performance**: Must handle at least 50,000 individuals per tree smoothly.  
- **Storage**: Local database (SQLite recommended).  
- **Security**: Encryption for local files; GDPR-compliant data handling.  
- **Usability**: Accessible UI with scalable fonts and high-contrast mode.  
- **Localization**: Support for **Swedish initially**, extensible to other languages later.  

## 5. Technical Architecture
- **Frontend**: Cross-platform UI framework (e.g., Qt, Avalonia, or Electron + React).  
- **Backend**: Local database (SQLite) for structured data, filesystem for media.  
- **File Formats**:  
  - Internal format: JSON or SQLite  
  - Import/export: GEDCOM, CSV, PDF  

## 6. User Interface
### Main Screens
1. **Dashboard**: List of family trees with “create/import” options.  
2. **Tree View**: Interactive visualization with search bar and toolbar.  
3. **Individual Profile**: Detailed view with personal data, media gallery, and notes.  
4. **Timeline View**: Events and milestones ordered by date.  
5. **Reports/Export Screen**: Options to generate reports and export data.  

### UI Elements
- Ribbon/toolbar with main actions (Add Person, Import, Export, Print).  
- Context menus for quick actions on individuals.  
- Drag & drop to reorganize relationships (with validation).  

## 7. Future Extensions
- DNA test integration (e.g., importing 23andMe/Ancestry data).  
- Historical records integration (via APIs).  
- Mobile companion app (iOS, Android).  
