<template>
  <div class="admin-view">
    <div class="admin-header">
      <h1>Panel de Administración</h1>
      <button @click="logout" class="logout-button">Cerrar Sesión</button>
    </div>

    <div class="admin-content">
      <!-- User Creation Form -->
      <div class="admin-section" ref="userFormSection">
        <h2>{{ editingUser ? 'Editar Usuario' : 'Crear Nuevo Usuario' }}</h2>
        
        <form @submit.prevent="handleSubmitUser" class="user-form">
          <div class="form-row">
            <div class="form-group">
              <label for="username">Usuario:</label>
              <input
                id="username"
                v-model="userForm.username"
                type="text"
                required
                :disabled="loading"
                placeholder="Nombre de usuario"
              >
            </div>
            
            <div class="form-group">
              <label for="role">Tipo de Usuario:</label>
              <select id="role" v-model="userForm.role" :disabled="loading">
                <option value="regular">Usuario Regular</option>
                <option value="admin">Administrador</option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label for="password">{{ editingUser ? 'Nueva Contraseña (opcional):' : 'Contraseña:' }}</label>
            <input
              id="password"
              v-model="userForm.password"
              type="password"
              :required="!editingUser"
              :disabled="loading"
              placeholder="Contraseña"
            >
          </div>

          <div v-if="userForm.role === 'regular'" class="form-group">
            <label>Auxiliares Permitidos:</label>
            <div class="auxiliary-checkboxes">
              <label v-for="aux in availableAuxiliaries" :key="aux.id" class="checkbox-label">
                <input
                  type="checkbox"
                  :value="aux.id"
                  v-model="userForm.auxiliaries"
                  :disabled="loading"
                >
                {{ aux.name }}
              </label>
            </div>
          </div>

          <div class="form-buttons">
            <button type="submit" :disabled="loading">
              {{ loading ? 'Procesando...' : (editingUser ? 'Actualizar Usuario' : 'Crear Usuario') }}
            </button>
            
            <button v-if="editingUser" type="button" @click="cancelEdit" :disabled="loading">
              Cancelar
            </button>
          </div>
        </form>

      </div>


      <!-- Users List -->
      <div class="admin-section">
        <h2>Usuarios Existentes</h2>
        
        <div v-if="loadingUsers" class="loading">
          Cargando usuarios...
        </div>

        <div v-else-if="users.length === 0" class="no-users">
          No hay usuarios registrados.
        </div>

        <div v-else class="users-table">
          <table>
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Tipo</th>
                <th>Auxiliares</th>
                <th>Creado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="user in users" :key="user.id">
                <td class="username">{{ user.username }}</td>
                <td>
                  <span class="role-badge" :class="user.role">
                    {{ user.role === 'admin' ? 'Administrador' : 'Regular' }}
                  </span>
                </td>
                <td>
                  <div class="auxiliaries">
                    <span v-if="user.role === 'admin'" class="all-auxiliaries">
                      Todos
                    </span>
                    <span v-else-if="user.auxiliaries.length === 0" class="no-auxiliaries">
                      Ninguno
                    </span>
                    <span v-else class="auxiliary-list">
                      {{ user.auxiliaries.map(aux => getAuxiliaryName(aux)).join(', ') }}
                    </span>
                  </div>
                </td>
                <td class="date">{{ formatDate(user.created_at) }}</td>
                <td class="actions">
                  <button @click="editUser(user)" :disabled="loading" class="edit-btn">
                    Editar
                  </button>
                  <button @click="showPasswordModal(user)" :disabled="loading" class="password-btn">
                    Cambiar Contraseña
                  </button>
                  <button 
                    @click="confirmDeleteUser(user)" 
                    :disabled="loading || user.id === currentUser.id"
                    class="delete-btn"
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Auxiliary Names Management -->
      <div class="admin-section">
        <h2>Nombres de Auxiliares</h2>
        
        <div v-if="loadingAuxNames" class="loading">
          Cargando nombres de auxiliares...
        </div>

        <div v-else class="names-management">
          <div v-for="aux in auxiliaryNamesList" :key="aux.id" class="name-item">
            <div class="name-info">
              <span class="name-label">Auxiliar {{ aux.id }}:</span>
              <input 
                v-model="aux.customName" 
                type="text" 
                :placeholder="`Auxiliar ${aux.id}`"
                class="name-input"
              >
            </div>
            <div class="name-controls">
              <label class="checkbox-label">
                <input 
                  type="checkbox" 
                  v-model="aux.useCustom"
                >
                Usar nombre personalizado
              </label>
            </div>
          </div>
        </div>
        <div class="section-actions">
            <button 
              @click="updateAllAuxiliaryNames"
              :disabled="loading"
              class="section-update-btn"
            >
              {{ loading ? 'Actualizando...' : 'Actualizar Auxiliares' }}
            </button>
          </div>
      </div>

      <!-- Channel Names Management -->
      <div class="admin-section">
        <h2>Nombres de Canales</h2>
        
        <div v-if="loadingChannelNames" class="loading">
          Cargando nombres de canales...
        </div>

        <div v-else class="names-management channel-names">
          <div v-for="ch in channelNamesList" :key="ch.number" class="name-item">
            <div class="name-info">
              <span class="name-label">Canal {{ ch.number }}:</span>
              <input 
                v-model="ch.customName" 
                type="text" 
                :placeholder="`Canal ${ch.number}`"
                class="name-input"
              >
            </div>
            <div class="name-controls">
              <label class="checkbox-label">
                <input 
                  type="checkbox" 
                  v-model="ch.useCustom"
                >
                Usar nombre personalizado
              </label>
            </div>
          </div>
        </div>
        <div class="section-actions">
          <button 
            @click="updateAllChannelNames"
            :disabled="loading"
            class="section-update-btn"
          >
            {{ loading ? 'Actualizando...' : 'Actualizar Canales' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Password Change Modal -->
    <div v-if="passwordModal.show" class="modal-overlay" @click="closePasswordModal">
      <div class="modal" @click.stop>
        <h3>Cambiar Contraseña</h3>
        <p>Usuario: <strong>{{ passwordModal.user?.username }}</strong></p>
        
        <form @submit.prevent="changePassword">
          <div class="form-group">
            <label>Nueva Contraseña:</label>
            <input
              v-model="passwordModal.newPassword"
              type="password"
              required
              :disabled="loading"
              placeholder="Nueva contraseña"
            >
          </div>
          
          <div class="modal-buttons">
            <button type="submit" :disabled="loading">
              {{ loading ? 'Cambiando...' : 'Cambiar Contraseña' }}
            </button>
            <button type="button" @click="closePasswordModal" :disabled="loading">
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div v-if="deleteModal.show" class="modal-overlay" @click="closeDeleteModal">
      <div class="modal" @click.stop>
        <h3>Confirmar Eliminación</h3>
        <p>¿Estás seguro de que quieres eliminar el usuario <strong>{{ deleteModal.user?.username }}</strong>?</p>
        <p class="warning">Esta acción no se puede deshacer.</p>
        
        <div class="modal-buttons">
          <button @click="deleteUser" :disabled="loading" class="delete-confirm">
            {{ loading ? 'Eliminando...' : 'Eliminar Usuario' }}
          </button>
          <button @click="closeDeleteModal" :disabled="loading">
            Cancelar
          </button>
        </div>
      </div>
    </div>

    <!-- Confirmation Message Modal -->
    <div v-if="confirmationModal.show" class="modal-overlay" @click="closeConfirmationModal">
      <div class="modal" @click.stop>
        <div class="modal-icon" :class="confirmationModal.type">
          <span v-if="confirmationModal.type === 'success'">✓</span>
          <span v-else-if="confirmationModal.type === 'error'">✗</span>
          <span v-else>ℹ</span>
        </div>
        <h3>{{ confirmationModal.type === 'error' ? 'Error' : 'Confirmación' }}</h3>
        <p>{{ confirmationModal.message }}</p>
        
        <div class="modal-buttons">
          <button @click="closeConfirmationModal" class="primary-btn">
            Aceptar
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, reactive, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { useSocket } from '@/composables/useSocket'

export default {
  name: 'AdminView',
  setup() {
    const router = useRouter()
    const { disconnect: disconnectSocket } = useSocket()
    const { 
      user: currentUser, 
      logout: authLogout, 
      getUsers, 
      createUser, 
      updateUser, 
      deleteUser: deleteUserApi, 
      changeUserPassword,
      checkAuth,
      api
    } = useAuth()

    const users = ref([])
    const availableAuxiliaries = ref([])
    const loading = ref(false)
    const loadingUsers = ref(false)
    const editingUser = ref(null)
    const userFormSection = ref(null)

    // Names management
    const auxiliaryNamesList = ref([])
    const channelNamesList = ref([])
    const loadingAuxNames = ref(false)
    const loadingChannelNames = ref(false)

    const userForm = reactive({
      username: '',
      password: '',
      role: 'regular',
      auxiliaries: []
    })

    const passwordModal = reactive({
      show: false,
      user: null,
      newPassword: ''
    })

    const deleteModal = reactive({
      show: false,
      user: null
    })

    const confirmationModal = reactive({
      show: false,
      message: '',
      type: 'success' // 'success', 'error', 'info'
    })

    const resetForm = () => {
      userForm.username = ''
      userForm.password = ''
      userForm.role = 'regular'
      userForm.auxiliaries = []
      editingUser.value = null
    }

    const showMessage = (msg, type = 'success') => {
      confirmationModal.message = msg
      confirmationModal.type = type
      confirmationModal.show = true
    }

    const closeConfirmationModal = () => {
      confirmationModal.show = false
      confirmationModal.message = ''
      confirmationModal.type = 'success'
    }

    const loadUsers = async () => {
      loadingUsers.value = true
      try {
        users.value = await getUsers()
      } catch (error) {
        console.error('Error loading users:', error)
        
        // If unauthorized, redirect to login
        if (error.response?.status === 401) {
          router.push('/login')
          return
        }
        
        showMessage('Error cargando usuarios: ' + (error.response?.data?.error || error.message), 'error')
      } finally {
        loadingUsers.value = false
      }
    }

    const loadAuxiliaries = async () => {
      try {
        const response = await api.get('/auxiliaries')
        availableAuxiliaries.value = response.data.auxiliaries
      } catch (error) {
        console.error('Error loading auxiliaries:', error)
      }
    }

    const handleSubmitUser = async () => {
      loading.value = true
      try {
        const userData = {
          username: userForm.username,
          role: userForm.role,
          auxiliaries: userForm.role === 'admin' ? [] : userForm.auxiliaries
        }

        if (userForm.password && userForm.password.trim() !== '') {
          userData.password = userForm.password
        }

        if (editingUser.value) {
          await updateUser(editingUser.value.id, userData)
          showMessage('Usuario actualizado exitosamente')
        } else {
          await createUser(userData)
          showMessage('Usuario creado exitosamente')
        }

        resetForm()
        await loadUsers()
      } catch (error) {
        showMessage('Error: ' + (error.response?.data?.error || error.message), 'error')
      } finally {
        loading.value = false
      }
    }

    const editUser = async (user) => {
      editingUser.value = user
      userForm.username = user.username
      userForm.password = ''
      userForm.role = user.role
      userForm.auxiliaries = user.role === 'admin' ? [] : [...user.auxiliaries]
      
      // Auto-scroll to the form section on mobile/small screens
      await nextTick()
      if (userFormSection.value) {
        userFormSection.value.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start' 
        })
      }
    }

    const cancelEdit = () => {
      resetForm()
    }

    const showPasswordModal = (user) => {
      passwordModal.user = user
      passwordModal.newPassword = ''
      passwordModal.show = true
    }

    const closePasswordModal = () => {
      passwordModal.show = false
      passwordModal.user = null
      passwordModal.newPassword = ''
    }

    const changePassword = async () => {
      loading.value = true
      try {
        await changeUserPassword(passwordModal.user.id, passwordModal.newPassword)
        showMessage('Contraseña cambiada exitosamente')
        closePasswordModal()
      } catch (error) {
        showMessage('Error cambiando contraseña: ' + (error.response?.data?.error || error.message), 'error')
      } finally {
        loading.value = false
      }
    }

    const confirmDeleteUser = (user) => {
      deleteModal.user = user
      deleteModal.show = true
    }

    const closeDeleteModal = () => {
      deleteModal.show = false
      deleteModal.user = null
    }

    const deleteUser = async () => {
      loading.value = true
      try {
        await deleteUserApi(deleteModal.user.id)
        showMessage('Usuario eliminado exitosamente')
        closeDeleteModal()
        await loadUsers()
      } catch (error) {
        showMessage('Error eliminando usuario: ' + (error.response?.data?.error || error.message), 'error')
      } finally {
        loading.value = false
      }
    }

    const logout = async () => {
      disconnectSocket() // Disconnect socket before logout
      await authLogout()
      router.push('/login')
    }

    const getAuxiliaryName = (auxId) => {
      const aux = availableAuxiliaries.value.find(a => a.id === auxId)
      return aux ? aux.name : `Auxiliar ${auxId}`
    }

    const formatDate = (dateString) => {
      return new Date(dateString).toLocaleDateString('es-ES')
    }

    // Names management methods
    const loadAuxiliaryNames = async () => {
      loadingAuxNames.value = true
      try {
        const response = await api.get('/admin/auxiliary-names')
        const auxNamesData = response.data.auxiliaryNames
        
        // Create array for all 6 auxiliaries
        auxiliaryNamesList.value = Array.from({ length: 6 }, (_, i) => {
          const auxId = i + 1
          const existing = auxNamesData.find(aux => aux.auxiliary_id === auxId)
          return {
            id: auxId,
            customName: existing?.custom_name || `Auxiliar ${auxId}`,
            useCustom: Boolean(existing?.use_custom ?? true)
          }
        })
      } catch (error) {
        console.error('Error loading auxiliary names:', error)
        showMessage('Error cargando nombres de auxiliares', 'error')
      } finally {
        loadingAuxNames.value = false
      }
    }

    const loadChannelNames = async () => {
      loadingChannelNames.value = true
      try {
        const response = await api.get('/admin/channel-names')
        const channelNamesData = response.data.channelNames
        
        // Create array for all 16 channels
        channelNamesList.value = Array.from({ length: 16 }, (_, i) => {
          const chNumber = i + 1
          const existing = channelNamesData.find(ch => ch.channel_number === chNumber)
          return {
            number: chNumber,
            customName: existing?.custom_name || `Canal ${chNumber}`,
            useCustom: Boolean(existing?.use_custom ?? true)
          }
        })
      } catch (error) {
        console.error('Error loading channel names:', error)
        showMessage('Error cargando nombres de canales', 'error')
      } finally {
        loadingChannelNames.value = false
      }
    }

    const updateAllAuxiliaryNames = async () => {
      // Validar que ningún nombre esté vacío
      const invalidAux = auxiliaryNamesList.value.find(aux => !aux.customName.trim())
      if (invalidAux) {
        showMessage(`El nombre del auxiliar ${invalidAux.id} no puede estar vacío`, 'error')
        return
      }
      
      loading.value = true
      try {
        let updatedCount = 0
        let errors = []
        
        for (const aux of auxiliaryNamesList.value) {
          try {
            await api.put(`/admin/auxiliary-names/${aux.id}`, {
              customName: aux.customName.trim(),
              useCustom: aux.useCustom
            })
            updatedCount++
          } catch (error) {
            console.error(`Error updating auxiliary ${aux.id}:`, error)
            errors.push(`Auxiliar ${aux.id}`)
          }
        }
        
        if (errors.length === 0) {
          showMessage(`✅ ${updatedCount} auxiliares actualizados correctamente`)
        } else if (updatedCount > 0) {
          showMessage(`⚠️ ${updatedCount} auxiliares actualizados, ${errors.length} con errores: ${errors.join(', ')}`, 'error')
        } else {
          showMessage('❌ Error actualizando todos los auxiliares', 'error')
        }
      } catch (error) {
        console.error('Error in batch auxiliary update:', error)
        showMessage('Error actualizando auxiliares', 'error')
      } finally {
        loading.value = false
      }
    }

    const updateAllChannelNames = async () => {
      // Validar que ningún nombre esté vacío
      const invalidChannel = channelNamesList.value.find(ch => !ch.customName.trim())
      if (invalidChannel) {
        showMessage(`El nombre del canal ${invalidChannel.number} no puede estar vacío`, 'error')
        return
      }
      
      loading.value = true
      try {
        let updatedCount = 0
        let errors = []
        
        for (const ch of channelNamesList.value) {
          try {
            await api.put(`/admin/channel-names/${ch.number}`, {
              customName: ch.customName.trim(),
              useCustom: ch.useCustom
            })
            updatedCount++
          } catch (error) {
            console.error(`Error updating channel ${ch.number}:`, error)
            errors.push(`Canal ${ch.number}`)
          }
        }
        
        if (errors.length === 0) {
          showMessage(`✅ ${updatedCount} canales actualizados correctamente`)
        } else if (updatedCount > 0) {
          showMessage(`⚠️ ${updatedCount} canales actualizados, ${errors.length} con errores: ${errors.join(', ')}`, 'error')
        } else {
          showMessage('❌ Error actualizando todos los canales', 'error')
        }
      } catch (error) {
        console.error('Error in batch channel update:', error)
        showMessage('Error actualizando canales', 'error')
      } finally {
        loading.value = false
      }
    }


    onMounted(async () => {
      // Check authentication first
      try {
        // Verify user session is still valid
        const authValid = await checkAuth()
        
        if (!authValid || !currentUser.value) {
          router.push('/login')
          return
        }
        
        if (currentUser.value.role !== 'admin') {
          router.push('/')
          return
        }

        // Load data
        await loadUsers()
        await loadAuxiliaries()
        await loadAuxiliaryNames()
        await loadChannelNames()
      } catch (error) {
        console.error('Error in admin view initialization:', error)
        // If authentication fails, redirect to login
        router.push('/login')
      }
    })

    return {
      currentUser,
      users,
      availableAuxiliaries,
      loading,
      loadingUsers,
      editingUser,
      userForm,
      userFormSection,
      passwordModal,
      deleteModal,
      confirmationModal,
      // Names management
      auxiliaryNamesList,
      channelNamesList,
      loadingAuxNames,
      loadingChannelNames,
      updateAllAuxiliaryNames,
      updateAllChannelNames,
      // User management
      handleSubmitUser,
      editUser,
      cancelEdit,
      showPasswordModal,
      closePasswordModal,
      changePassword,
      confirmDeleteUser,
      closeDeleteModal,
      deleteUser,
      closeConfirmationModal,
      logout,
      getAuxiliaryName,
      formatDate
    }
  }
}
</script>

