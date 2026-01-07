/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense } from 'react';
import { useAppLogic } from './useAppLogic';
import { Toast } from '../UI/Toast';
import { AppSkeleton } from '../UI/AppSkeleton';
import {
  DEFAULT_TEMPERATURE, DEFAULT_MAX_TOKENS
} from './constants';
import { VersionMismatchOverlay } from '../UI/VersionMismatchOverlay';
import { ChatArea } from '../Chat/ChatArea';

// Helper to safely lazy load named exports
function lazyLoad<T extends React.ComponentType<any>>(
  importFactory: () => Promise<{ [key: string]: any }>,
  name: string
): React.LazyExoticComponent<T> {
  return React.lazy(() =>
    importFactory().then((module) => {
      const component = module[name];
      if (!component) {
        throw new Error(`Module does not export component '${name}'`);
      }
      return { default: component };
    })
  );
}

// Lazy Load Major UI Blocks
const Sidebar = lazyLoad(() => import('../Sidebar/Sidebar'), 'Sidebar');
const ChatHeader = lazyLoad(() => import('../Chat/ChatHeader'), 'ChatHeader');
const SourcesSidebar = lazyLoad(() => import('../AI/SourcesSidebar'), 'SourcesSidebar');
const ArtifactSidebar = lazyLoad(() => import('../Sidebar/ArtifactSidebar'), 'ArtifactSidebar');
const ThinkingSidebar = lazyLoad(() => import('../Sidebar/ThinkingSidebar'), 'ThinkingSidebar');
const AppModals = lazyLoad(() => import('./AppModals'), 'AppModals');
const TestRunner = lazyLoad(() => import('../Testing'), 'TestRunner');

export const App = () => {
  const logic = useAppLogic();

  const currentChat = logic.currentChatId
    ? logic.chatHistory.find(c => c.id === logic.currentChatId)
    : null;
  const chatTitle = currentChat ? currentChat.title : null;
  
  const activeMessage = currentChat?.messages?.length ? currentChat.messages[currentChat.messages.length - 1] : null;

  return (
    <div 
        ref={logic.appContainerRef} 
        className={`flex h-full bg-page text-content-primary overflow-hidden transition-[height] duration-200 ease-out ${logic.isAnyResizing ? 'pointer-events-none' : ''}`}
        style={{ 
            height: !logic.isDesktop && logic.visualViewportHeight && logic.isMainInputFocused ? `${logic.visualViewportHeight}px` : '100dvh',
            // On mobile, we use visualViewportHeight to handle keyboard, so we reset safe-areas slightly differently
            paddingTop: logic.isDesktop ? '0' : 'env(safe-area-inset-top)', 
            paddingBottom: logic.isDesktop ? '0' : 'env(safe-area-inset-bottom)',
        }}
    >
      {logic.versionMismatch && <VersionMismatchOverlay />}
      
      <Suspense fallback={<AppSkeleton />}>
        <Sidebar
          key={logic.isDesktop ? 'desktop' : 'mobile'}
          isDesktop={logic.isDesktop}
          isOpen={logic.isSidebarOpen} 
          setIsOpen={logic.setIsSidebarOpen}
          isCollapsed={logic.isSidebarCollapsed}
          setIsCollapsed={logic.handleSetSidebarCollapsed}
          width={logic.sidebarWidth}
          setWidth={logic.handleSetSidebarWidth}
          isResizing={logic.isResizing}
          setIsResizing={logic.setIsResizing}
          history={logic.chatHistory}
          isHistoryLoading={logic.isHistoryLoading}
          currentChatId={logic.currentChatId}
          onNewChat={logic.startNewChat}
          isNewChatDisabled={logic.isNewChatDisabled}
          onLoadChat={logic.loadChat}
          onDeleteChat={logic.handleDeleteChatRequest}
          onUpdateChatTitle={logic.updateChatTitle}
          onSettingsClick={() => logic.setIsSettingsOpen(true)}
        />

        <main 
            className="relative z-10 flex-1 flex flex-col min-w-0 h-full bg-page transition-colors duration-300"
        >
          {/* Mobile Header Toggle */}
          {!logic.isDesktop && (
            <div className="absolute top-0 left-0 right-0 z-30 pointer-events-none px-4 py-3">
               <div className="h-11 flex items-center">
                 {!logic.isSidebarOpen && (
                  <button
                    onClick={() => logic.setIsSidebarOpen(true)}
                    className="pointer-events-auto p-2 rounded-lg bg-layer-1/80 backdrop-blur-md border border-border text-content-secondary hover:text-content-primary shadow-sm"
                    aria-label="Open sidebar"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
                  </button>
                 )}
               </div>
            </div>
          )}

          <div className="flex-1 flex flex-col w-full min-h-0">
             <ChatHeader 
                isDesktop={logic.isDesktop}
                handleToggleSidebar={logic.handleToggleSidebar}
                isSidebarOpen={logic.isSidebarOpen}
                isSidebarCollapsed={logic.isSidebarCollapsed}
                onImportChat={logic.handleImportChat}
                onExportChat={logic.handleExportChat}
                onShareChat={() => logic.handleShareChat()}
                isChatActive={logic.isChatActive}
                chatTitle={chatTitle}
             />
             <ChatArea 
                messageListRef={logic.messageListRef}
                messages={logic.messages}
                isLoading={logic.isLoading}
                isAppLoading={logic.modelsLoading || logic.settingsLoading}
                sendMessage={logic.sendMessage}
                onCancel={logic.cancelGeneration}
                ttsVoice={logic.ttsVoice}
                ttsModel={logic.ttsModel}
                setTtsVoice={logic.setTtsVoice}
                currentChatId={logic.currentChatId}
                activeModel={logic.activeModel} 
                onShowSources={logic.handleShowSources}
                approveExecution={logic.approveExecution}
                denyExecution={logic.denyExecution}
                onRegenerate={logic.regenerateResponse}
                onSetActiveResponseIndex={logic.setActiveResponseIndex}
                isAgentMode={logic.isAgentMode}
                setIsAgentMode={logic.setIsAgentMode}
                backendStatus={logic.backendStatus}
                backendError={logic.backendError}
                onRetryConnection={logic.retryConnection}
                hasApiKey={!!logic.apiKey}
                onEditMessage={logic.editMessage}
                onNavigateBranch={logic.navigateBranch}
                onInputFocusChange={logic.setIsMainInputFocused}
             />
          </div>
        </main>

        <SourcesSidebar
          isOpen={logic.isSourcesSidebarOpen}
          onClose={logic.handleCloseSourcesSidebar}
          sources={logic.sourcesForSidebar}
          width={logic.sourcesSidebarWidth}
          setWidth={logic.handleSetSourcesSidebarWidth}
          isResizing={logic.isSourcesResizing}
          setIsResizing={logic.setIsSourcesResizing}
        />

        <ThinkingSidebar
            isOpen={false} // Hidden by default as per logic
            onClose={() => {}} 
            message={activeMessage}
            sendMessage={logic.sendMessage}
            width={logic.thinkingSidebarWidth}
            setWidth={logic.handleSetThinkingSidebarWidth}
            isResizing={logic.isThinkingResizing}
            setIsResizing={logic.setIsThinkingResizing}
            onRegenerate={logic.regenerateResponse}
        />

        <ArtifactSidebar
            isOpen={logic.isArtifactOpen}
            onClose={() => logic.setIsArtifactOpen(false)}
            content={logic.artifactContent}
            language={logic.artifactLanguage}
            width={logic.artifactWidth}
            setWidth={logic.setArtifactWidth}
            isResizing={logic.isArtifactResizing}
            setIsResizing={logic.setIsArtifactResizing}
        />

        <AppModals
          isDesktop={logic.isDesktop}
          isSettingsOpen={logic.isSettingsOpen}
          setIsSettingsOpen={logic.setIsSettingsOpen}
          isMemoryModalOpen={logic.isMemoryModalOpen}
          setIsMemoryModalOpen={logic.setIsMemoryModalOpen}
          isImportModalOpen={logic.isImportModalOpen}
          setIsImportModalOpen={logic.setIsImportModalOpen}
          handleFileUploadForImport={logic.handleFileUploadForImport}
          onRunTests={() => logic.setIsTestMode(true)}
          onDownloadLogs={logic.handleDownloadLogs}
          onShowDataStructure={logic.handleShowDataStructure}
          availableModels={logic.availableModels}
          availableImageModels={logic.availableImageModels}
          availableVideoModels={logic.availableVideoModels}
          availableTtsModels={logic.availableTtsModels}
          activeModel={logic.activeModel}
          onModelChange={logic.onModelChange}
          modelsLoading={logic.modelsLoading || logic.settingsLoading}
          clearAllChats={logic.handleRequestClearAll}
          apiKey={logic.apiKey}
          onSaveApiKey={logic.onSaveApiKey}
          suggestionApiKey={logic.suggestionApiKey}
          onSaveSuggestionApiKey={logic.onSaveSuggestionApiKey}
          aboutUser={logic.aboutUser}
          setAboutUser={logic.setAboutUser}
          aboutResponse={logic.aboutResponse}
          setAboutResponse={logic.setAboutResponse}
          temperature={logic.temperature}
          setTemperature={logic.setTemperature}
          maxTokens={logic.maxTokens}
          setMaxTokens={logic.setMaxTokens}
          imageModel={logic.imageModel}
          onImageModelChange={logic.onImageModelChange}
          videoModel={logic.videoModel}
          onVideoModelChange={logic.onVideoModelChange}
          ttsModel={logic.ttsModel}
          onTtsModelChange={logic.onTtsModelChange}
          defaultTemperature={DEFAULT_TEMPERATURE}
          defaultMaxTokens={DEFAULT_MAX_TOKENS}
          isMemoryEnabled={logic.isMemoryEnabled}
          setIsMemoryEnabled={logic.setIsMemoryEnabled}
          onManageMemory={() => logic.setIsMemoryModalOpen(true)}
          memoryContent={logic.memoryContent}
          memoryFiles={logic.memoryFiles}
          clearMemory={logic.clearMemory}
          updateBackendMemory={logic.updateBackendMemory}
          updateMemoryFiles={logic.updateMemoryFiles}
          isConfirmationOpen={logic.isConfirmationOpen}
          memorySuggestions={logic.memorySuggestions}
          confirmMemoryUpdate={logic.confirmMemoryUpdate}
          cancelMemoryUpdate={logic.cancelMemoryUpdate}
          ttsVoice={logic.ttsVoice}
          setTtsVoice={logic.setTtsVoice}
          confirmation={logic.confirmation}
          onConfirm={logic.handleConfirm}
          onCancel={logic.handleCancel}
          theme={logic.theme}
          setTheme={logic.setTheme}
          serverUrl={logic.serverUrl}
          onSaveServerUrl={logic.onSaveServerUrl}
          provider={logic.provider}
          openRouterApiKey={logic.openRouterApiKey}
          onProviderChange={logic.onProviderChange}
        />

        {logic.isTestMode && (
            <TestRunner 
                isOpen={logic.isTestMode}
                onClose={() => logic.setIsTestMode(false)}
                runTests={logic.runDiagnosticTests}
            />
        )}
      </Suspense>

      <Toast 
        message={logic.toast?.message || null} 
        type={logic.toast?.type} 
        onClose={logic.closeToast} 
      />
    </div>
  );
};